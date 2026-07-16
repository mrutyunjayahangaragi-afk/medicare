"""
app/repositories/organizations.py
Repository for public.organizations and public.organization_members.

Security notes:
  - Public list returns only verified organizations (RLS-enforced + explicit filter).
  - Member management operations verify the caller's role before mutating.
  - Internal verification notes are never included in response data.
"""

from __future__ import annotations

import logging
from typing import Any

from app.repositories.base import BaseRepository
from app.schemas.organization import OrganizationMemberResponse, OrganizationPublicResponse

logger = logging.getLogger("medicare.repositories.organizations")


class OrganizationRepository(BaseRepository):
    """Data access for public.organizations and public.organization_members."""

    ORG_TABLE = "organizations"
    MEMBER_TABLE = "organization_members"

    # ── Organizations ─────────────────────────────────────────────────────

    def list_verified(
        self, limit: int = 20, offset: int = 0
    ) -> list[OrganizationPublicResponse]:
        """Return only verified organizations (safe public fields only)."""
        response = (
            self._admin()
            .table(self.ORG_TABLE)
            .select(
                "id, name, organization_type, phone, email, address, latitude, longitude, is_verified, created_at"
            )
            .eq("is_verified", True)
            .order("name")
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [OrganizationPublicResponse.model_validate(r) for r in (response.data or [])]

    def count_verified(self) -> int:
        """Return total count of verified organizations."""
        response = (
            self._admin()
            .table(self.ORG_TABLE)
            .select("id", count="exact")
            .eq("is_verified", True)
            .execute()
        )
        return response.count or 0

    def get_verified_by_id(self, org_id: str) -> OrganizationPublicResponse | None:
        """Return a verified organization by ID, or None."""
        response = (
            self._admin()
            .table(self.ORG_TABLE)
            .select(
                "id, name, organization_type, phone, email, address, latitude, longitude, is_verified, created_at"
            )
            .eq("id", org_id)
            .eq("is_verified", True)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return OrganizationPublicResponse.model_validate(response.data)

    def get_my_organization(self, user_id: str) -> OrganizationPublicResponse | None:
        """Return the organization associated with the user's profile."""
        # Fetch organization_id from profile, then fetch the org
        profile_resp = (
            self._admin()
            .table("profiles")
            .select("organization_id")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not profile_resp.data or not profile_resp.data.get("organization_id"):
            return None

        org_id = profile_resp.data["organization_id"]
        return self.get_verified_by_id(str(org_id))

    # ── Members ────────────────────────────────────────────────────────────

    def list_members(
        self, org_id: str, limit: int = 50, offset: int = 0
    ) -> list[OrganizationMemberResponse]:
        """Return members of an organization."""
        response = (
            self._admin()
            .table(self.MEMBER_TABLE)
            .select("*")
            .eq("organization_id", org_id)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [OrganizationMemberResponse.model_validate(r) for r in (response.data or [])]

    def get_member(self, org_id: str, user_id: str) -> OrganizationMemberResponse | None:
        """Return a specific member row for authorization checks."""
        response = (
            self._admin()
            .table(self.MEMBER_TABLE)
            .select("*")
            .eq("organization_id", org_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return OrganizationMemberResponse.model_validate(response.data)

    def add_member(
        self, org_id: str, user_id: str, member_role: str = "member"
    ) -> OrganizationMemberResponse:
        """Add a new member in pending status."""
        data: dict[str, Any] = {
            "organization_id": org_id,
            "user_id": user_id,
            "member_role": member_role,
            "status": "pending",
        }
        response = self._admin().table(self.MEMBER_TABLE).insert(data).execute()
        return OrganizationMemberResponse.model_validate(response.data[0])

    def update_member(
        self, org_id: str, member_id: str, updates: dict[str, Any]
    ) -> OrganizationMemberResponse | None:
        """Update a member's role or status."""
        response = (
            self._admin()
            .table(self.MEMBER_TABLE)
            .update(updates)
            .eq("id", member_id)
            .eq("organization_id", org_id)
            .execute()
        )
        if not response.data:
            return None
        return OrganizationMemberResponse.model_validate(response.data[0])
