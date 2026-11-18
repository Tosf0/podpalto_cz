"""``python -m podpalto_app.worker`` – start the queue worker.

Environment (Railway variables or .env):
    SUPABASE_URL          https://<project>.supabase.co
    SUPABASE_SECRET_KEY   secret key (service role) – only here, never in the frontend
    WORKER_ID             name shown in the admin page (default: host name)
    WORKER_POLL_S         seconds between queue checks when idle (default 30)
    WORKER_HEARTBEAT_S    seconds between progress writes during a long run (default 300)
plus everything the flows need (ANTHROPIC_API_KEY, MANAGER_MODEL, AGENT_MODEL, TOOLS_API_URL).
"""

from __future__ import annotations

import logging
import os
import socket
import sys


def configure_logging() -> None:
    """INFO and WARNING to stdout, ERROR and above to stderr.

    Railway marks every stderr line as an error; logging's default handler writes everything
    to stderr, so the dashboard showed normal progress ("HTTP 200 OK") in red."""
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    out = logging.StreamHandler(sys.stdout)
    out.setLevel(logging.INFO)
    out.addFilter(lambda record: record.levelno < logging.ERROR)
    err = logging.StreamHandler(sys.stderr)
    err.setLevel(logging.ERROR)
    for handler in (out, err):
        handler.setFormatter(fmt)
    logging.basicConfig(level=logging.INFO, handlers=[out, err], force=True)


def main() -> None:
    configure_logging()

    import podpalto_app.settings  # noqa: F401  (loads .env, turns CrewAI tracing off)
    from podpalto_app.worker.handlers import ANALYSIS_HANDLERS, JOB_HANDLERS
    from podpalto_app.worker.runner import Worker
    from podpalto_app.worker.supabase import SupabaseClient

    db = SupabaseClient(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SECRET_KEY", ""))
    Worker(
        db,
        os.getenv("WORKER_ID") or f"app@{socket.gethostname()}",
        job_handlers=JOB_HANDLERS,
        analysis_handlers=ANALYSIS_HANDLERS,
        poll_s=float(os.getenv("WORKER_POLL_S", "30")),
        heartbeat_s=float(os.getenv("WORKER_HEARTBEAT_S", "300")),
    ).run_forever()


if __name__ == "__main__":
    main()
