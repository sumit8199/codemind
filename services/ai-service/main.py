import logging
import uuid
from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from app.config import settings
from app.models import ReviewRequest, ReviewResponse
from app.orchestrator import orchestrator

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("codemind-ai-service")

app = FastAPI(
    title="CodeMind AI Analysis Engine",
    version="1.0.0",
    description="Internal Multi-Agent Code Review Service for CodeMind AI"
)


@app.middleware("http")
async def verify_internal_auth_and_trace(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id

    # Exclude health check from token auth
    if request.url.path == "/internal/health":
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response

    auth_header = request.headers.get("X-Internal-Token") or request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header else ""

    if token != settings.INTERNAL_SERVICE_TOKEN:
        logger.warning(f"[{correlation_id}] Unauthorized service call to {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": {
                    "code": "UNAUTHORIZED_SERVICE",
                    "message": "Invalid or missing internal service token",
                    "requestId": correlation_id
                }
            }
        )

    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


@app.get("/internal/health")
async def internal_health():
    return {
        "status": "healthy",
        "service": "ai-service",
        "provider": settings.AI_PROVIDER,
        "model": settings.AI_MODEL,
        "version": "1.0.0"
    }


@app.post("/internal/reviews", response_model=ReviewResponse)
async def process_review(review_req: ReviewRequest, request: Request):
    corr_id = getattr(request.state, "correlation_id", "unknown")
    logger.info(f"[{corr_id}] Starting multi-agent analysis for review {review_req.review_id} ({len(review_req.files)} file(s))")

    try:
        response = await orchestrator.execute_review(review_req)
        logger.info(f"[{corr_id}] Finished analysis for review {review_req.review_id} with status {response.status}")
        return response
    except Exception as exc:
        logger.error(f"[{corr_id}] Error analyzing review {review_req.review_id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal analysis engine error during workflow execution"
        )


@app.post("/internal/reviews/{review_id}/cancel")
async def cancel_review(review_id: str, request: Request):
    corr_id = getattr(request.state, "correlation_id", "unknown")
    logger.info(f"[{corr_id}] Received cancellation request for review {review_id}")
    return {"reviewId": review_id, "status": "cancelling"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
