"""
Celery Configuration for Heroku Deployment
Optimized for receipt OCR background processing
"""
import os
import sys
from celery import Celery

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('smart_accounting')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Heroku Redis Configuration with enhanced SSL support
import ssl
from kombu.utils.url import safe_quote

# Get Redis URLs with TLS preference for Heroku
broker_url = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_TLS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0")))

# Force rediss:// for TLS on Heroku
if broker_url.startswith("redis://"):
    broker_url = broker_url.replace("redis://", "rediss://", 1)

result_backend = os.getenv("CELERY_RESULT_BACKEND", broker_url)

_use_ssl = os.getenv("CELERY_BROKER_USE_SSL", "1") == "1"
_cert_reqs = os.getenv("CELERY_SSL_CERT_REQS", "none")  # 'required' if you upload certs

# Configure SSL with more robust settings
broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE} if _use_ssl else None
redis_backend_use_ssl = broker_use_ssl

# Enhanced network resilience on Heroku
broker_transport_options = {
    "visibility_timeout": 60 * 30,
    "socket_keepalive": True,
    "socket_timeout": 5,
    "retry_on_timeout": True,
    "max_connections": 10,
    "connection_pool_kwargs": {
        "retry_on_timeout": True,
        "socket_connect_timeout": 10,
        "socket_timeout": 10,
    },
}
result_backend_transport_options = {"retry_on_timeout": True}

app.conf.update(
    # Redis URL from Heroku environment with SSL support
    broker_url=broker_url,
    result_backend=result_backend,
    broker_use_ssl=broker_use_ssl,
    broker_transport_options=broker_transport_options,
    redis_backend_use_ssl=redis_backend_use_ssl,
    result_backend_transport_options=result_backend_transport_options,
    
    # Performance Optimizations
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Concurrency and Performance
    worker_prefetch_multiplier=1,  # One task per worker at a time
    task_acks_late=True,          # Acknowledge after task completion
    worker_max_tasks_per_child=100, # Restart workers after 100 tasks
    
    # Task routing for OCR operations
    task_routes={
        'receipts.tasks.process_receipt_task': {'queue': 'ocr_processing'},
        'receipts.tasks.batch_process_receipts': {'queue': 'ocr_batch'},
        'receipts.tasks.cleanup_temp_files': {'queue': 'maintenance'},
    },
    
    # Task time limits (important for Heroku dyno cycling)
    task_soft_time_limit=600,  # 10 minutes soft limit
    task_time_limit=720,       # 12 minutes hard limit
    
    # Retry configuration
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Result expiration
    result_expires=3600,  # 1 hour
    
    # Enhanced Heroku reliability settings
    task_always_eager=False,
    task_eager_propagates=False,
    worker_send_task_events=True,
    task_send_sent_event=True,
    broker_connection_retry_on_startup=True,
    task_reject_on_worker_lost=True,
)
