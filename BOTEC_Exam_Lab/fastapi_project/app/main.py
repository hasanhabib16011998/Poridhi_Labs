from fastapi import FastAPI, Response
from app.routers import api,health
from app.metrics.system_metrics import prometheus_metrics, start_metrics_collection, CONTENT_TYPE_LATEST
from app.metrics.system_metrics import start_metrics_collection  # If you use system metrics
from app.middleware.metrics_middleware import MetricsMiddleware


app = FastAPI(title="FastAPI Metrics App")

# Start system metrics collection in background
start_metrics_collection()

# Add HTTP metrics middleware
app.add_middleware(MetricsMiddleware)

# Include routers
app.include_router(api.router)
app.include_router(health.router)

@app.get("/metrics")
def metrics():
    data = prometheus_metrics()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)