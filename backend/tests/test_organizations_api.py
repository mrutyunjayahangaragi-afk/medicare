"""
tests/test_organizations_api.py
Tests for the organizations API endpoints.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_MOCK_ORG = {
    "id": "00000000-0000-0000-0000-000000000201",
    "name": "City General Hospital",
    "organization_type": "hospital",
    "phone": "+14155550300",
    "email": "info@citygeneral.example.com",
    "address": "1 Hospital Drive",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "is_verified": True,
    "created_at": "2024-01-01T00:00:00",
}


class TestListOrganizations:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/organizations")
        assert response.status_code == 401

    def test_returns_only_verified(self, authed_client: TestClient) -> None:
        from app.schemas.organization import OrganizationPublicResponse
        org = OrganizationPublicResponse.model_validate(_MOCK_ORG)
        with (
            patch(
                "app.repositories.organizations.OrganizationRepository.list_verified",
                return_value=[org],
            ),
            patch(
                "app.repositories.organizations.OrganizationRepository.count_verified",
                return_value=1,
            ),
        ):
            response = authed_client.get("/api/v1/organizations")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        items = data["data"]["items"]
        # All returned items must be verified
        for item in items:
            assert item["is_verified"] is True

    def test_response_excludes_internal_notes(self, authed_client: TestClient) -> None:
        from app.schemas.organization import OrganizationPublicResponse
        org = OrganizationPublicResponse.model_validate(_MOCK_ORG)
        with (
            patch(
                "app.repositories.organizations.OrganizationRepository.list_verified",
                return_value=[org],
            ),
            patch(
                "app.repositories.organizations.OrganizationRepository.count_verified",
                return_value=1,
            ),
        ):
            response = authed_client.get("/api/v1/organizations")
        payload_str = str(response.json())
        assert "verification_notes" not in payload_str
        assert "internal" not in payload_str.lower()


class TestGetOrganization:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/organizations/some-id")
        assert response.status_code == 401

    def test_returns_verified_org(self, authed_client: TestClient) -> None:
        from app.schemas.organization import OrganizationPublicResponse
        org = OrganizationPublicResponse.model_validate(_MOCK_ORG)
        with patch(
            "app.repositories.organizations.OrganizationRepository.get_verified_by_id",
            return_value=org,
        ):
            response = authed_client.get(
                "/api/v1/organizations/00000000-0000-0000-0000-000000000201"
            )
        assert response.status_code == 200

    def test_unverified_or_missing_returns_404(self, authed_client: TestClient) -> None:
        with patch(
            "app.repositories.organizations.OrganizationRepository.get_verified_by_id",
            return_value=None,
        ):
            response = authed_client.get("/api/v1/organizations/missing-id")
        assert response.status_code == 404


class TestMemberManagement:
    def test_unauthorized_member_management_fails(self, authed_client: TestClient) -> None:
        """Normal user without manager role must get 403."""
        with patch(
            "app.repositories.organizations.OrganizationRepository.get_member",
            return_value=None,
        ):
            response = authed_client.get(
                "/api/v1/organizations/00000000-0000-0000-0000-000000000201/members"
            )
        assert response.status_code == 403

    def test_manager_can_list_members(self, authed_client: TestClient) -> None:
        from app.schemas.organization import OrganizationMemberResponse
        from datetime import datetime
        member = OrganizationMemberResponse(
            id="00000000-0000-0000-0000-000000000301",  # type: ignore
            organization_id="00000000-0000-0000-0000-000000000201",  # type: ignore
            user_id=FAKE_USER_ID,  # type: ignore
            member_role="owner",
            status="active",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 1),
        )
        with (
            patch(
                "app.repositories.organizations.OrganizationRepository.get_member",
                return_value=member,
            ),
            patch(
                "app.repositories.organizations.OrganizationRepository.list_members",
                return_value=[member],
            ),
        ):
            response = authed_client.get(
                "/api/v1/organizations/00000000-0000-0000-0000-000000000201/members"
            )
        assert response.status_code == 200
