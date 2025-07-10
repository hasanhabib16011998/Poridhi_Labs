import time
import os
import threading
import gc
import psutil

from prometheus_client import (
    Gauge,
    Counter,
    CollectorRegistry,
    generate_latest,
    CONTENT_TYPE_LATEST,
)

# Create a custom registry (optional)
registry = CollectorRegistry()

# Process info
process = psutil.Process(os.getpid())

# Metrics definitions
process_cpu_seconds_total = Counter(
    'process_cpu_seconds_total',
    'Total user and system CPU time spent in seconds.',
    registry=registry,
)
process_cpu_percent = Gauge(
    'process_cpu_percent',
    'Process CPU utilization percentage.',
    registry=registry,
)
process_resident_memory_bytes = Gauge(
    'process_resident_memory_bytes',
    'Resident memory size in bytes.',
    registry=registry,
)
process_virtual_memory_bytes = Gauge(
    'process_virtual_memory_bytes',
    'Virtual memory size in bytes.',
    registry=registry,
)
process_start_time_seconds = Gauge(
    'process_start_time_seconds',
    'Start time of the process since unix epoch in seconds.',
    registry=registry,
)
process_uptime_seconds = Gauge(
    'process_uptime_seconds',
    'Uptime of the process in seconds.',
    registry=registry,
)

process_num_fds = Gauge(
    'process_open_fds',
    'Number of open file descriptors.',
    registry=registry,
)
process_num_threads = Gauge(
    'process_num_threads',
    'Number of OS threads in the process.',
    registry=registry,
)
process_gc_collections_total = Gauge(
    'process_gc_collections_total',
    'Number of garbage collection collections per generation.',
    ['generation'],
    registry=registry,
)

# Set static metric at startup
process_start_time_seconds.set(process.create_time())

def collect_metrics():
    """Collect and update metrics periodically in the background."""
    last_cpu_times = process.cpu_times()
    while True:
        # Update CPU seconds total (user + system)
        cpu_times = process.cpu_times()
        cpu_seconds = cpu_times.user + cpu_times.system
        last_cpu_seconds = last_cpu_times.user + last_cpu_times.system
        delta = cpu_seconds - last_cpu_seconds
        if delta > 0:
            process_cpu_seconds_total.inc(delta)
        last_cpu_times = cpu_times

        # CPU percent
        process_cpu_percent.set(process.cpu_percent(interval=None))

        # Memory usage
        mem_info = process.memory_info()
        process_resident_memory_bytes.set(mem_info.rss)
        process_virtual_memory_bytes.set(mem_info.vms)

        # Uptime
        process_uptime_seconds.set(time.time() - process.create_time())

        # File descriptors (only on UNIX)
        try:
            fds = process.num_fds()
        except Exception:
            fds = 0
        process_num_fds.set(fds)

        # Threads
        process_num_threads.set(process.num_threads())

        # GC stats
        counts = gc.get_count()
        for gen, count in enumerate(counts):
            process_gc_collections_total.labels(generation=str(gen)).set(count)

        time.sleep(5)  # Adjust as needed

def start_metrics_collection():
    # Start collection in a background thread
    thread = threading.Thread(target=collect_metrics, daemon=True)
    thread.start()

def prometheus_metrics():
    return generate_latest(registry)