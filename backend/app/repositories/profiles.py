"""
app/repositories/profiles.py
Repository for public.profiles operations.

Responsibilities:
  - Fetch a single profile by user ID.
  - Upsert a profile row (used on signup / OAuth callback).
  - Update safe profile fields.
  - NEVER update protected fields (role, organization_id, responder_type,
    is_verified) through the user-facing update path.
"""

from __future__ import annotations

import logging
from typing import Any

from app.repositories.base import BaseRepository
from app.schemas.database.profile import ProfileRow, ProfileUpdate

logger = logging.getLogger("medicare.repositories.profiles")


class ProfileRepository(BaseRepository):
    """Data access for the public.profiles table."""

    TABLE = "profiles"

    # ── Read ──────────────────────────────────────────────────────────────

    def get_by_id(self, user_id: str) -> ProfileRow | None:
        """Fetch a profile by UUID.  Returns None if not found."""
        response = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return ProfileRow.model_validate(response.data)

    # ── Write ─────────────────────────────────────────────────────────────

    def upsert_on_signup(
        self,
        user_id: str,
        full_name: str | None,
        email: str | None,
        avatar_url: str | None,
    ) -> None:
        """Safely upsert a profile row after a new user signs up.

        - Uses the admin client because the user JWT is not yet available
          at the point this is called from the auth webhook.
        - Does not overwrite existing non-null values.
        """
        payload: dict[str, Any] = {
            "id": user_id,
            "role": "user",           # always start as user
            "is_verified": False,
        }
        if full_name:
            payload["full_name"] = full_name
        if email:
            payload["email"] = email
        if avatar_url:
            payload["avatar_url"] = avatar_url

        logger.info("Upserting profile for user %s", user_id)
        (
            self._admin()
            .table(self.TABLE)
            .upsert(payload, on_conflict="id", ignore_duplicates=False)
            .execute()
        )

    def update_safe_fields(
        self,
        user_id: str,
        updates: ProfileUpdate,
    ) -> ProfileRow | None:
        """Update only safe profile fields (no role/org/verified changes).

        The database trigger protect_profile_auth_fields provides a second
        layer of protection, but we also exclude those fields here.
        """
        safe_data = updates.model_dump(
            exclude_none=True,
            exclude={
                "role",
                "organization_id",
                "responder_type",
                "is_verified",
            },
        )
        if not safe_data:
            logger.debug("update_safe_fields: no updatable fields provided")
            return self.get_by_id(user_id)

        response = (
            self._admin()
            .table(self.TABLE)
            .update(safe_data)
            .eq("id", user_id)
            .execute()
        )
        if not response.data:
            return None
        return ProfileRow.model_validate(response.data[0])
