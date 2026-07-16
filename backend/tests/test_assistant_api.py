import pytest
from fastapi.testclient import TestClient


def test_get_assistant_config(client: TestClient):
    response = client.get("/api/v1/assistant/config")
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert "max_input_characters" in data
    assert "disclaimer" in data


def test_chat_unauthenticated(client: TestClient):
    response = client.post("/api/v1/assistant/chat", json={"message": "hello"})
    # Expect 401 because no auth header
    assert response.status_code == 401


def test_conversations_unauthenticated(client: TestClient):
    response = client.get("/api/v1/assistant/conversations")
    assert response.status_code == 401
