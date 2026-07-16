"""
app/utils/phone.py
Basic phone number normalisation and validation.

No third-party phone library is required. This implements lightweight
rules suitable for the Medicare platform without country-specific logic.
"""

from __future__ import annotations

import re

_SEPARATOR_PATTERN = re.compile(r"[\s\-\(\)\.]")

# E.164-style: + followed by 7–15 digits  OR  7–15 digits without +
_VALID_PATTERN = re.compile(r"^\+?\d{7,15}$")


def normalize_phone(raw: str | None) -> str | None:
    """Normalize and validate a phone number string.

    Steps:
        1. Strip surrounding whitespace.
        2. Preserve a leading + (international prefix).
        3. Remove common separators: spaces, hyphens, parentheses, dots.
        4. Validate total length (7–15 digits, optional leading +).

    Returns the normalised string, or None if input is None/empty.
    Raises ValueError for obviously invalid values.
    """
    if raw is None:
        return None

    stripped = raw.strip()
    if not stripped:
        return None

    # Preserve leading +
    prefix = "+" if stripped.startswith("+") else ""
    digits_only = prefix + _SEPARATOR_PATTERN.sub("", stripped.lstrip("+"))

    if not _VALID_PATTERN.match(digits_only):
        raise ValueError(
            f"Invalid phone number: '{raw}'. "
            "Expected 7–15 digits, optionally prefixed with '+'."
        )

    return digits_only
