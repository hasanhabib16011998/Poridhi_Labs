# Node.js Performance Monitoring Project

This project demonstrates a complete setup for monitoring and load testing a Node.js application using Prometheus, Grafana, and k6.

## Project Structure

```
.
├── monitoring/           # Monitoring stack configuration
│   ├── docker-compose.yaml   # Docker compose for monitoring services
│   ├── prometheus.yml        # Prometheus configuration
│   ├── grafana-dashboard.json # Grafana dashboard configuration
│   └── images/              # Documentation images
│
├── nodejs-app/          # Sample Node.js application
│   ├── index.js         # Main application code
│   ├── package.json     # Node.js dependencies
│   ├── Dockerfile       # Container configuration
│   └── node_modules/    # Installed dependencies
│
├── k6/                  # Load testing scripts
│   └── loadtest.js      # k6 load testing configuration
│
├── docker-compose.yml   # docker-compose for App, DB and Node Exporter services
├── init.sql            # Database initialization script
└── .gitignore         # Git ignore configuration
```

## Components

1. **Node.js Application**
   - A sample Node.js application instrumented with Prometheus metrics
   - Containerized using Docker
   - Includes performance monitoring endpoints

2. **Monitoring Stack**
   - Prometheus for metrics collection
   - Grafana for visualization and dashboards
   - Custom dashboards for performance monitoring

3. **Load Testing**
   - k6 scripts for performance testing
   - Configurable load patterns and scenarios

