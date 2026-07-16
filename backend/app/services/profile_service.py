"""
app/services/profile_service.py
Business logic for user profile operations.
"""

from __future__ import annotations

import logging

from app.repositories.profiles import ProfileRepository
from app.schemas.database.profile import ProfileRow, ProfileUpdate
from app.schemas.profile import ProfilePatchRequest, ProfileUpdateRequest

logger = logging.getLogger("medicare.services.profiles")

# Fields that must never be accepted through the public update path
_PROTECTED_FIELDS = {"role", "organization_id", "responder_type", "is_verified"}


class ProfileService:
    """Orchestrates profile reads and safe updates."""

    def __init__(self, repo: ProfileRepository | None = None) -> None:
        self._repo = repo or ProfileRepository()

    def get_profile(self, user_id: str) -> ProfileRow | None:
        """Fetch the user's profile row. Returns None if not yet created."""
        return self._repo.get_by_id(user_id)

    def full_update(
        self, user_id: str, payload: ProfileUpdateRequest
    ) -> ProfileRow | None:
        """Replace all editable profile fields (PUT semantics).

        Protected fields are silently stripped before the update.
        """
        safe = ProfileUpdate(
            **{k: v for k, v in payload.model_dump().items() if k not in _PROTECTED_FIELDS}
        )
        result = self._repo.update_safe_fields(user_id, safe)
        logger.info("Profile full-update completed for user %s", user_id)
        return result

    def partial_update(
        self, user_id: str, payload: ProfilePatchRequest
    ) -> ProfileRow | None:
        """Apply only provided editable fields (PATCH semantics).

        Protected fields are silently stripped before the update.
        """
        provided = {
            k: v
            for k, v in payload.model_dump(exclude_none=True).items()
            if k not in _PROTECTED_FIELDS
        }
        if not provided:
            return self._repo.get_by_id(user_id)

        safe = ProfileUpdate(**provided)
        result = self._repo.update_safe_fields(user_id, safe)
        logger.info("Profile partial-update completed for user %s", user_id)
        return result
