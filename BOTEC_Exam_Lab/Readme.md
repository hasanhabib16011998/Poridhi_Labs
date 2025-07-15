---

# 📘 FastAPI Application with Prometheus Monitoring

## 🚀 Overview

This project is a containerized FastAPI application instrumented with **custom HTTP and system-level Prometheus metrics**. The monitoring data is exposed at `/metrics`, which Prometheus scrapes at regular intervals. This setup provides observability into request patterns, performance, and system behavior of your FastAPI service.

---

## 🧩 Architecture

```
+----------------+     Scrapes     +---------------------+
|  Prometheus    |<----------------| FastAPI Application |
| (Port 9090)    |   /metrics      | (Port 8000)         |
+----------------+                 +---------------------+
        ↑                                  ↑
        |                                  |
     docker-compose manages both containers
```

* `FastAPI` serves your main app and exposes `/metrics`
* `Prometheus` scrapes metrics from FastAPI every 5 seconds
* All services are containerized with **Docker Compose**

---

## 📦 Components

### 1. **FastAPI Application**

* Exposes business APIs and `/metrics` endpoint
* Captures:

  * Request count, duration, size
  * Response size
  * Process metrics (CPU, memory, threads, GC, etc.)

### 2. **Prometheus**

* Configured to scrape metrics from `fastapi:8000/metrics`
* Runs in its own container
* Configured with `prometheus.yml`

---

## 🧪 Available Metrics

### 🔧 HTTP Metrics

| Metric Name                     | Labels                   | Description                         |
| ------------------------------- | ------------------------ | ----------------------------------- |
| `http_requests_total`           | method, endpoint, status | Total HTTP requests                 |
| `http_request_duration_seconds` | method, endpoint         | Duration of HTTP requests (seconds) |
| `http_request_size_bytes`       | method, endpoint         | Size of request body (bytes)        |
| `http_response_size_bytes`      | method, endpoint         | Size of response body (bytes)       |

### 🖥️ System Metrics

| Metric Name                     | Description                             |
| ------------------------------- | --------------------------------------- |
| `process_cpu_seconds_sum`       | Total CPU time (user + system)          |
| `process_cpu_percent`           | CPU utilization (%)                     |
| `process_resident_memory_bytes` | Physical memory used (bytes)            |
| `process_virtual_memory_bytes`  | Virtual memory used (bytes)             |
| `process_uptime_seconds`        | Uptime of the process                   |
| `process_open_fds`              | Number of open file descriptors         |
| `process_num_threads`           | Number of OS threads in use             |
| `process_gc_collections_total`  | Garbage collection counts by generation |

---

## 🧰 Project Structure

```
project/
│
├── docker-compose.yml
├── fastapi_project/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── routers/
│       │   ├── api.py
│       │   └── health.py
│       └── metrics/
│           ├── http_metrics.py
│           ├── system_metrics.py
│           └── metrics_middleware.py
└── prometheus/
    └── prometheus.yml
```

---

## ⚙️ How to Run the Application

### ✅ Requirements

* Docker
* Docker Compose

### 📥 Step-by-Step Setup

1. **Clone the project**

   ```bash
   git clone <your-repo-url>
   cd project/
   ```

2. **Build and run the services**

   ```bash
   docker-compose up --build
   ```

3. **Access the services**

   * FastAPI: [http://localhost:8000](http://localhost:8000)
   * Metrics endpoint: [http://localhost:8000/metrics](http://localhost:8000/metrics)
   * Prometheus UI: [http://localhost:9090](http://localhost:9090)

---

## 🔍 Example Prometheus Query

Once Prometheus is up, visit [http://localhost:9090](http://localhost:9090) and use queries like:

```promql
http_requests_total
http_request_duration_seconds
process_cpu_percent
```

---

## 🧹 Stopping the Services

```bash
docker-compose down
```

---

## 📝 Notes

* You are using a **custom Prometheus registry** instead of the global one.
* Metrics are collected **every 5 seconds** by default (`scrape_interval`).
* You can extend the app with more business routes in the `routers/` directory.

---