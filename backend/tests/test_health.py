"""Tests for the Health and System Telemetry API."""


def test_root_metadata(client):
    """Verify root endpoint returns platform metadata and tagline."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "ORCHESTRA AI"
    assert "Intelligence in Sync" in data["tagline"]
    assert data["status"] == "operational"


def test_health_endpoint(client):
    """Verify /api/health returns database status, hardware metrics, and uptime."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["database"] == "healthy"
    assert "hardware" in data
    assert data["hardware"]["ram_total_gb"] > 0
    assert "gpu_detected" in data["hardware"]
    assert data["uptime_seconds"] >= 0
