import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from app.config import settings


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/internal/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ai-service"


@pytest.mark.asyncio
async def test_unauthorized_without_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/internal/reviews", json={
            "review_id": "test-uuid-1",
            "language": "typescript",
            "categories": ["security"],
            "files": [{"path": "auth.ts", "content": "export function test() {}"}]
        })
        assert res.status_code == 401
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] == "UNAUTHORIZED_SERVICE"


@pytest.mark.asyncio
async def test_authorized_multi_agent_review():
    transport = ASGITransport(app=app)
    headers = {"X-Internal-Token": settings.INTERNAL_SERVICE_TOKEN}
    sample_code = """
    import fs from 'fs';
    export function executeUserQuery(req: any) {
        const apiKey = "sk_live_123456789abcdef";
        const userQuery = "SELECT * FROM users WHERE id = " + req.query.id;
        const config = fs.readFileSync("/etc/config.json");
        console.log("Processing token: " + req.headers.authorization);
        return userQuery;
    }
    """
    payload = {
        "review_id": "test-uuid-2",
        "language": "typescript",
        "categories": ["bugs", "security", "performance", "quality", "tests"],
        "files": [{"path": "src/query.ts", "content": sample_code}]
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/internal/reviews", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["review_id"] == "test-uuid-2"
        assert data["status"] == "completed"
        assert len(data["agent_runs"]) >= 3
        assert len(data["findings"]) > 0

        # Validate finding schema contract
        first_finding = data["findings"][0]
        assert "id" in first_finding
        assert "agent" in first_finding
        assert "severity" in first_finding
        assert "confidence" in first_finding
        assert "fingerprint" in first_finding
        assert "evidence" in first_finding
        assert first_finding["filePath"] == "src/query.ts"
        assert first_finding["startLine"] is not None
