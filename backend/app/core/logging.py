"""
app/core/logging.py
Centralised logging configuration for the Medicare backend.

- Human-readable timestamped format for development.
- INFO level by default; DEBUG when debug=True.
- Idempotent: calling configure_logging() multiple times does not add
  duplicate handlers (safe with Uvicorn's --reload).
- Never logs secrets, tokens, or patient data.
"""

from __future__ import annotations

import logging
import sys

# Root logger name used throughout the project
_LOGGER_NAME = "medicare"

# Guard so we only configure once per process
_configured = False


def configure_logging(debug: bool = False) -> None:
    """Set up structured console logging.

    Args:
        debug: When True, set the log level to DEBUG; otherwise INFO.
    """
    global _configured  # noqa: PLW0603

    if _configured:
        return
    _configured = True

    level = logging.DEBUG if debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(level)

    root_logger = logging.getLogger(_LOGGER_NAME)
    # Avoid duplicate handlers when the module is reloaded (--reload mode)
    if root_logger.handlers:
        root_logger.handlers.clear()

    root_logger.setLevel(level)
    root_logger.addHandler(handler)
    # Propagate to root only in debug mode; avoids double-printing in prod
    root_logger.propagate = debug

    # Quieten noisy third-party loggers
    for noisy in ("httpx", "httpcore", "uvicorn.access"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
