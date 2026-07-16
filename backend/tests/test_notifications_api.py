"""
tests/test_notifications_api.py
Tests for the notifications API endpoints.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_MOCK_NOTIFICATION = {
    "id": "00000000-0000-0000-0000-000000000101",
    "recipient_id": FAKE_USER_ID,
    "user_id": FAKE_USER_ID,
    "request_id": None,
    "actor_id": None,
    "type": "emergency",
    "title": "Request updated",
    "message": "Your request status changed.",
    "data": None,
    "is_read": False,
    "read_at": None,
    "created_at": "2024-01-01T00:00:00",
}


_PATCH_NOTIFY_CLIENT = "app.api.v1.routes.notifications.create_user_supabase_client"


class TestListNotifications:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/notifications")
        assert response.status_code == 401

    def test_returns_paginated_list(self, authed_client: TestClient) -> None:
        from app.schemas.notification import NotificationResponse
        n = NotificationResponse.model_validate(_MOCK_NOTIFICATION)
        with (
            patch(
                "app.repositories.notifications.NotificationRepository.list_for_user",
                return_value=[n],
            ),
            patch(
                "app.repositories.notifications.NotificationRepository.count_for_user",
                return_value=1,
            ),
        ):
            response = authed_client.get("/api/v1/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "items" in data["data"]

    def test_always_filters_by_own_user_id(self, authed_client: TestClient) -> None:
        """Verify the repo is called with the token user_id."""
        with (
            patch(
                "app.repositories.notifications.NotificationRepository.list_for_user",
                return_value=[],
            ) as mock_list,
            patch(
                "app.repositories.notifications.NotificationRepository.count_for_user",
                return_value=0,
            ),
        ):
            authed_client.get("/api/v1/notifications")
        call_kwargs = mock_list.call_args
        assert call_kwargs.kwargs.get("user_id") == FAKE_USER_ID or call_kwargs.args[0] == FAKE_USER_ID


class TestUnreadCount:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/notifications/unread-count")
        assert response.status_code == 401

    def test_returns_unread_count_structure(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_NOTIFY_CLIENT, return_value=MagicMock()),
            patch(
                "app.repositories.notifications.NotificationRepository.get_unread_count_via_rpc",
                return_value=5,
            ),
        ):
            response = authed_client.get("/api/v1/notifications/unread-count")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["unread_count"] == 5


class TestMarkNotificationRead:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post("/api/v1/notifications/some-id/read")
        assert response.status_code == 401

    def test_mark_own_notification_read(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_NOTIFY_CLIENT, return_value=MagicMock()),
            patch(
                "app.repositories.notifications.NotificationRepository.mark_read_via_rpc",
                return_value={"success": True},
            ),
        ):
            response = authed_client.post(
                "/api/v1/notifications/00000000-0000-0000-0000-000000000101/read"
            )
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestMarkAllRead:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post("/api/v1/notifications/read-all")
        assert response.status_code == 401

    def test_mark_all_read(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_NOTIFY_CLIENT, return_value=MagicMock()),
            patch(
                "app.repositories.notifications.NotificationRepository.mark_all_read_via_rpc",
                return_value={"success": True},
            ),
        ):
            response = authed_client.post("/api/v1/notifications/read-all")
        assert response.status_code == 200
        assert response.json()["success"] is True
