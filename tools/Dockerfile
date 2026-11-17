# Tools service image. Build from the repository root (it needs the workspace lockfile):
#   docker build -f tools/Dockerfile -t podpalto-tools .
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.13.8 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /repo

# OCR for price lists published as images (image_ocr sources): Tesseract with Czech data.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-ces \
    && rm -rf /var/lib/apt/lists/*

# 1) Third-party dependencies only: this layer is rebuilt only when the lockfile changes.
COPY pyproject.toml uv.lock ./
COPY app/pyproject.toml app/pyproject.toml
COPY tools/pyproject.toml tools/pyproject.toml
# Then headless Chromium for pages that need JavaScript (rendered_html sources), ~150 MB.
RUN uv sync --frozen --no-dev --package podpalto-tools --no-install-workspace \
    && playwright install --with-deps chromium

# 2) The service itself (no CrewAI, no app code).
COPY tools/ tools/
RUN uv sync --frozen --no-dev --package podpalto-tools --no-editable

EXPOSE 8001
CMD ["uvicorn", "podpalto_tools.api:app", "--host", "0.0.0.0", "--port", "8001"]
