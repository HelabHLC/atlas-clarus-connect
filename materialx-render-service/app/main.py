import base64
import binascii
import hashlib
import os
import tempfile
import uuid
from pathlib import Path
from xml.etree import ElementTree

from fastapi import Depends, FastAPI, Header, HTTPException

from .models import RenderRequest, RenderResponse
from .renderer import RenderFailed, RendererUnavailable, render


VERSION = "0.4.0"
MAX_ASSET_BYTES = int(os.environ.get("MAX_ASSET_BYTES", str(10 * 1024 * 1024)))
RENDER_TIMEOUT_SECONDS = int(os.environ.get("RENDER_TIMEOUT_SECONDS", "45"))
EXPECTED_MASTER_SHA256 = os.environ.get(
    "ATLAS_MASTER_SHA256",
    "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4",
)

app = FastAPI(title="ATLAS Clarus MaterialX Render Service", version=VERSION)


def validate_standalone_materialx(data: bytes) -> None:
    lowered = data.lower()
    forbidden = (b"<!doctype", b"<!entity", b"<xi:include", b"xinclude")
    if any(token in lowered for token in forbidden):
        raise HTTPException(status_code=422, detail="External entities and XInclude are prohibited in v0.4.0.")
    try:
        root = ElementTree.fromstring(data)
    except ElementTree.ParseError as exc:
        raise HTTPException(status_code=422, detail="MaterialX XML is not well formed.") from exc
    if root.tag.rsplit("}", 1)[-1] != "materialx":
        raise HTTPException(status_code=422, detail="The XML root element is not materialx.")
    stack = [(root, 1)]
    while stack:
        element, depth = stack.pop()
        if depth > 64:
            raise HTTPException(status_code=422, detail="MaterialX nesting exceeds the v0.4.0 safety limit.")
        if element.attrib.get("type", "").lower() == "filename":
            raise HTTPException(status_code=422, detail="External texture and filename inputs are not accepted in v0.4.0.")
        stack.extend((child, depth + 1) for child in element)


def authorize(authorization: str | None = Header(default=None)) -> None:
    expected = os.environ.get("RENDERER_BEARER_TOKEN", "")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Renderer authentication failed.")


@app.get("/healthz")
def health() -> dict:
    executable = Path(os.environ.get("MATERIALX_VIEW", "/opt/materialx/bin/MaterialXView"))
    return {
        "service": "ATLAS Clarus MaterialX Render Service",
        "version": VERSION,
        "renderer": "MaterialXView",
        "renderer_available": executable.is_file() and os.access(executable, os.X_OK),
        "mock_fallback": False,
    }


@app.post("/v1/render", response_model=RenderResponse, dependencies=[Depends(authorize)])
def render_material(request: RenderRequest) -> RenderResponse:
    if request.identity.master_sha256 != EXPECTED_MASTER_SHA256:
        raise HTTPException(status_code=422, detail="ATLAS master digest mismatch.")
    rgb = request.display_proxy.master_rgb_u8
    if any(not isinstance(channel, int) or channel < 0 or channel > 255 for channel in rgb):
        raise HTTPException(status_code=422, detail="Invalid master RGB display proxy.")
    try:
        material_bytes = base64.b64decode(request.asset.content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid material base64 payload.") from exc
    if not material_bytes or len(material_bytes) > MAX_ASSET_BYTES:
        raise HTTPException(status_code=413, detail="Material asset is empty or exceeds the configured limit.")
    if hashlib.sha256(material_bytes).hexdigest() != request.asset.sha256:
        raise HTTPException(status_code=422, detail="Material asset digest mismatch.")
    if not request.asset.uri.lower().endswith(".mtlx"):
        raise HTTPException(status_code=422, detail="v0.4.0 accepts MaterialX .mtlx assets only.")
    validate_standalone_materialx(material_bytes)

    job_id = str(uuid.uuid4())
    with tempfile.TemporaryDirectory(prefix="atlas-materialx-") as directory:
        work = Path(directory)
        material = work / "material.mtlx"
        output = work / "render.png"
        material.write_bytes(material_bytes)
        try:
            png, scene_digest = render(material, output, request.scene.model_dump(), RENDER_TIMEOUT_SECONDS)
        except RendererUnavailable as exc:
            raise HTTPException(status_code=503, detail={"code": "RENDERER_UNAVAILABLE", "message": str(exc)}) from exc
        except RenderFailed as exc:
            raise HTTPException(status_code=422, detail={"code": "MATERIALX_RENDER_FAILED", "message": str(exc)}) from exc

    return RenderResponse(
        connector_contract="ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1",
        job_id=job_id,
        renderer="MaterialXView",
        renderer_version=os.environ.get("MATERIALX_VERSION", "1.39.4"),
        status="CALCULATED",
        evidence_class="EXTERNAL_RENDERER_OUTPUT",
        media_type="image/png",
        output_base64=base64.b64encode(png).decode("ascii"),
        output_sha256=hashlib.sha256(png).hexdigest(),
        material_sha256=request.asset.sha256,
        scene_sha256=scene_digest,
        limitation="MaterialX was decoded and rendered. Output remains a calculated digital appearance, not a physical measurement or measured QC result.",
    )
