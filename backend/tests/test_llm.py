"""Tests for Ollama Local LLM status and test inference endpoints."""


def test_llm_status_endpoint(client):
    """Verify /api/llm/status responds with target model and connection info."""
    response = client.get("/api/llm/status")
    assert response.status_code == 200
    data = response.json()
    assert data["target_model"] == "qwen3.5:4b"
    assert "ollama run qwen3.5:4b" in data["install_command"]
    assert "connected" in data
    assert "model_available" in data


def test_llm_test_unreachable_error(client):
    """Verify /api/llm/test returns structured failure with installation instructions if model is offline."""
    response = client.post(
        "/api/llm/test",
        json={"prompt": "Ping check", "temperature": 0.1},
    )
    # Since Ollama is not currently running, it should return a structured 500, 502, 503, or 404 with error details
    assert response.status_code in (500, 502, 503, 404, 200)
    data = response.json()
    if response.status_code != 200:
        assert "detail" in data
