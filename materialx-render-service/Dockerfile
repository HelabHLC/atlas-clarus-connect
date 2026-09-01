FROM ubuntu:24.04

ARG MATERIALX_VERSION=1.39.4
ENV DEBIAN_FRONTEND=noninteractive \
    MATERIALX_VERSION=${MATERIALX_VERSION} \
    MATERIALX_VIEW=/opt/materialx/bin/MaterialXView \
    MATERIALX_DISPLAY_WRAPPER="xvfb-run -a" \
    LIBGL_ALWAYS_SOFTWARE=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates cmake g++ git ninja-build python3 python3-pip python3-venv \
    libgl1-mesa-dev libglu1-mesa-dev libglfw3-dev libxi-dev libxinerama-dev \
    libxcursor-dev libxrandr-dev libx11-dev libxt-dev mesa-utils xvfb xauth \
    && git clone --branch "v${MATERIALX_VERSION}" --depth 1 --recursive \
       https://github.com/AcademySoftwareFoundation/MaterialX.git /tmp/MaterialX \
    && cmake -S /tmp/MaterialX -B /tmp/MaterialX/build -G Ninja \
       -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/opt/materialx \
       -DMATERIALX_BUILD_VIEWER=ON -DMATERIALX_BUILD_GRAPH_EDITOR=OFF \
       -DMATERIALX_BUILD_PYTHON=OFF -DMATERIALX_BUILD_TESTS=OFF \
    && cmake --build /tmp/MaterialX/build --target install -j2 \
    && rm -rf /tmp/MaterialX /var/lib/apt/lists/*

WORKDIR /service
COPY requirements.txt .
RUN python3 -m pip install --break-system-packages --no-cache-dir -r requirements.txt \
    && useradd --system --uid 10001 --create-home renderer
COPY app ./app
RUN mkdir -p /tmp/atlas-clarus-meshes && chown -R renderer:renderer /service /tmp/atlas-clarus-meshes
USER renderer
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=3)"
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
