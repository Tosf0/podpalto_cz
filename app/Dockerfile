# App service image (CrewAI agents + public API). Build from the repository root:
#   docker build -f app/Dockerfile -t podpalto-app .
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.13.8 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    OUTPUT_DIR=/data/outputs

WORKDIR /repo

# 1) Third-party dependencies only: this layer is rebuilt only when the lockfile changes.
COPY pyproject.toml uv.lock ./
COPY app/pyproject.toml app/pyproject.toml
COPY tools/pyproject.toml tools/pyproject.toml
RUN uv sync --frozen --no-dev --package podpalto-app --no-install-workspace

# 2) The service itself (no tools code: tools are reached over HTTP via TOOLS_API_URL).
COPY app/ app/
RUN uv sync --frozen --no-dev --package podpalto-app --no-editable

EXPOSE 8000
CMD ["uvicorn", "podpalto_app.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
