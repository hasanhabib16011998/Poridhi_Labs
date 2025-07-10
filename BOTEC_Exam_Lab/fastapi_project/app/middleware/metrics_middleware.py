import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.metrics.http_metrics import (
    http_requests_total,
    http_request_duration_seconds,
    http_request_size_bytes,
    http_response_size_bytes,
)

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        endpoint = request.url.path
        start_time = time.time()
        request_body = await request.body()
        request_size = len(request_body)

        response: Response = await call_next(request)
        duration = time.time() - start_time
        status_code = response.status_code
        response_size = len(response.body) if hasattr(response, "body") and response.body else 0

        # Update metrics
        http_requests_total.labels(method, endpoint, str(status_code)).inc()
        http_request_duration_seconds.labels(method, endpoint).observe(duration)
        http_request_size_bytes.labels(method, endpoint).observe(request_size)
        http_response_size_bytes.labels(method, endpoint).observe(response_size)

        return response