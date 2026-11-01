"""Tests for Tasks lifecycle, validation, and querying."""


def test_list_tasks_empty(client):
    """Verify /api/tasks returns an empty array when no tasks exist."""
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    assert data["tasks"] == []
    assert data["total"] == 0


def test_create_task_validation_error(client):
    """Verify validation fails when title or description are too short."""
    # Description too short
    response = client.post(
        "/api/tasks",
        json={"title": "Test", "description": "short"},
    )
    assert response.status_code == 422


def test_create_and_get_task(client):
    """Verify creating a valid task and retrieving its details."""
    task_payload = {
        "title": "Analyze Distributed Memory Leak in Worker Cluster",
        "description": "Inspect heap profile dumps from worker-04 and identify dangling circular references in the event queue.",
        "category": "workflow_analysis",
        "priority": "high",
    }
    response = client.post("/api/tasks", json=task_payload)
    assert response.status_code == 201
    created = response.json()
    assert created["id"] is not None
    assert created["title"] == task_payload["title"]
    assert created["status"] == "pending"
    assert created["category"] == "workflow_analysis"

    # Fetch task by ID
    get_res = client.get(f"/api/tasks/{created['id']}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == created["id"]
    assert fetched["title"] == created["title"]


def test_update_and_delete_task(client):
    """Verify updating task status and subsequent deletion."""
    create_res = client.post(
        "/api/tasks",
        json={
            "title": "Automated Unit Test Generation for Auth Module",
            "description": "Generate Pytest test cases covering JWT expiration, invalid signatures, and edge cases.",
            "category": "code_generation",
        },
    )
    task_id = create_res.json()["id"]

    # Update status
    patch_res = client.patch(
        f"/api/tasks/{task_id}",
        json={"status": "completed", "result_summary": "14 tests generated with 100% branch coverage."},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "completed"
    assert "14 tests" in patch_res.json()["result_summary"]

    # Delete
    del_res = client.delete(f"/api/tasks/{task_id}")
    assert del_res.status_code == 204

    # Verify not found
    get_res = client.get(f"/api/tasks/{task_id}")
    assert get_res.status_code == 404
