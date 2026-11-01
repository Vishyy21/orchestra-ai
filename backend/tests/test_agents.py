"""Tests for Agents and Reports endpoints."""


def test_list_specialized_agents(client):
    """Verify that the 5 specialized agents are returned correctly."""
    response = client.get("/api/agents")
    assert response.status_code == 200
    agents = response.json()
    assert len(agents) == 5
    agent_names = [a["name"] for a in agents]
    assert "Planner Agent" in agent_names
    assert "Research Agent" in agent_names
    assert "Analysis Agent" in agent_names
    assert "Verification Agent" in agent_names
    assert "Reporter Agent" in agent_names


def test_reports_empty_and_create(client):
    """Verify reports return empty list initially and support creation."""
    # Empty check
    get_res = client.get("/api/reports")
    assert get_res.status_code == 200
    assert get_res.json() == []

    # Create report
    post_res = client.post(
        "/api/reports",
        json={
            "title": "Architecture Security Audit Report",
            "content": "Comprehensive review of auth middleware, SQL injection boundaries, and local LLM parameter controls.",
            "category": "security",
        },
    )
    assert post_res.status_code == 201
    rep = post_res.json()
    assert rep["id"] is not None
    assert rep["title"] == "Architecture Security Audit Report"

    # List again
    list_res = client.get("/api/reports")
    assert len(list_res.json()) == 1


def test_dashboard_metrics(client):
    """Verify /api/dashboard/metrics aggregates real database counts."""
    res = client.get("/api/dashboard/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_tasks" in data
    assert "available_agents" in data
    assert data["available_agents"] == 5
    assert "system_health" in data
    assert data["system_health"]["gpu_detected"] is True or data["system_health"]["gpu_detected"] is False
