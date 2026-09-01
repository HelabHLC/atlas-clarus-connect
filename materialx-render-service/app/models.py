from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Identity(BaseModel):
    identity_id: str
    atlas_row: int = Field(ge=0, le=13282)
    reference_code: str = Field(min_length=1, max_length=80)
    master_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    status: Literal["VERIFIED"]


class DisplayProxy(BaseModel):
    master_hex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    master_rgb_u8: List[int] = Field(min_length=3, max_length=3)
    source: Literal["VERIFIED_MASTER_PROJECTION"]


class Asset(BaseModel):
    asset_id: str = Field(min_length=1, max_length=160)
    uri: str = Field(min_length=1, max_length=255)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    media_type: str
    format: Literal["MATERIALX"]
    content_base64: str


class MaterialSelector(BaseModel):
    selector_id: Optional[str] = None
    selector_type: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=160)


class Scene(BaseModel):
    scene_id: str = Field(min_length=1, max_length=160)
    illumination: str = Field(min_length=1, max_length=160)
    view_angle_degrees: float = Field(ge=-180, le=180)
    gloss_proxy_GU: float = Field(ge=0, le=100)
    camera: str = Field(min_length=1, max_length=160)
    geometry: Dict[str, Any]


class RenderRequest(BaseModel):
    connector_contract: Literal["ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1"]
    identity: Identity
    display_proxy: DisplayProxy
    asset: Asset
    material_selector: MaterialSelector
    scene: Scene


class RenderResponse(BaseModel):
    connector_contract: Literal["ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1"]
    job_id: str
    renderer: Literal["MaterialXView"]
    renderer_version: str
    status: Literal["CALCULATED"]
    evidence_class: Literal["EXTERNAL_RENDERER_OUTPUT"]
    media_type: Literal["image/png"]
    output_base64: str
    output_sha256: str
    material_sha256: str
    scene_sha256: str
    limitation: str
