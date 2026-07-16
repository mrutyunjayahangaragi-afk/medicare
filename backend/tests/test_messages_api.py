"""
tests/test_messages_api.py
Tests for the messages API endpoints.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_PATCH_MSG_CLIENT = "app.api.v1.routes.messages.create_user_supabase_client"

_REQUEST_ID = "aaaaaaaa-0000-0000-0000-000000000001"


class TestListConversations:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/messages/conversations")
        assert response.status_code == 401

    def test_returns_conversations(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_MSG_CLIENT, return_value=MagicMock()),
            patch(
                "app.repositories.messages.MessageRepository.list_conversations_for_user",
                return_value=[],
            ),
        ):
            response = authed_client.get("/api/v1/messages/conversations")
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestGetConversation:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get(f"/api/v1/messages/{_REQUEST_ID}")
        assert response.status_code == 401

    def test_non_participant_gets_403_or_404(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        from fastapi import HTTPException
        from app.services.message_service import MessageService

        with (
            patch(_PATCH_MSG_CLIENT, return_value=MagicMock()),
            patch.object(
                MessageService,
                "get_conversation",
                side_effect=HTTPException(status_code=404, detail="Not found"),
            ),
        ):
            response = authed_client.get(f"/api/v1/messages/{_REQUEST_ID}")
        assert response.status_code in (403, 404)


class TestSendMessage:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post(
            f"/api/v1/messages/{_REQUEST_ID}", json={"message": "Hello"}
        )
        assert response.status_code == 401

    def test_empty_message_rejected(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            f"/api/v1/messages/{_REQUEST_ID}", json={"message": ""}
        )
        assert response.status_code == 422

    def test_message_too_long_rejected(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            f"/api/v1/messages/{_REQUEST_ID}", json={"message": "x" * 1001}
        )
        assert response.status_code == 422

    def test_non_participant_denied(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        from fastapi import HTTPException
        from app.services.message_service import MessageService

        with (
            patch(_PATCH_MSG_CLIENT, return_value=MagicMock()),
            patch.object(
                MessageService,
                "send_message",
                side_effect=HTTPException(status_code=403, detail="Not a participant"),
            ),
        ):
            response = authed_client.post(
                f"/api/v1/messages/{_REQUEST_ID}", json={"message": "Hello there"}
            )
        assert response.status_code == 403

    def test_recipient_id_cannot_be_provided(self, authed_client: TestClient) -> None:
        """The message schema must not accept a recipient_id field."""
        payload = {
            "message": "Hello there",
            "recipient_id": "00000000-0000-0000-0000-000000000099",
        }
        response = authed_client.post(f"/api/v1/messages/{_REQUEST_ID}", json=payload)
        assert response.status_code == 422

    def test_valid_message_sent(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        from app.services.message_service import MessageService

        with (
            patch(_PATCH_MSG_CLIENT, return_value=MagicMock()),
            patch.object(
                MessageService,
                "send_message",
                return_value={"success": True, "message_id": "msg-1"},
            ),
        ):
            response = authed_client.post(
                f"/api/v1/messages/{_REQUEST_ID}",
                json={"message": "I need help right now"},
            )
        assert response.status_code == 201
        assert response.json()["success"] is True


class TestMarkMessagesRead:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post(f"/api/v1/messages/{_REQUEST_ID}/read")
        assert response.status_code == 401

    def test_marks_as_read(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        from app.services.message_service import MessageService

        with (
            patch(_PATCH_MSG_CLIENT, return_value=MagicMock()),
            patch.object(
                MessageService,
                "mark_messages_read",
                return_value={"success": True},
            ),
        ):
            response = authed_client.post(f"/api/v1/messages/{_REQUEST_ID}/read")
        assert response.status_code == 200
