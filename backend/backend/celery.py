"""
Celery Configuration for Heroku Deployment
Optimized for receipt OCR background processing with web dyno safety
"""
import os
import sys
import ssl
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

# Heroku-safe Celery configuration with dyno role detection
# Prefer TLS URL from Heroku Redis
_broker = os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_TLS_URL") or os.getenv("REDIS_URL", "")
if _broker.startswith("redis://"):      # force TLS on Heroku
    _broker = _broker.replace("redis://", "rediss://", 1)

# Detect dyno role: web.* should not connect to result backend
_dyno = os.getenv("DYNO", "")
_is_web_dyno = _dyno.startswith("web.")

# Allow explicit override via env (1=disable result backend everywhere)
_disable_result = os.getenv("DISABLE_CELERY_RESULT", "0") == "1"

broker_url = _broker

# Result backend logic:
#  - On worker/beat dynos: use Redis result backend (default).
#  - On web dynos or when disabled: no result backend and ignore results.
if _is_web_dyno or _disable_result:
    result_backend = None
    task_ignore_result = True
    result_extended = False
else:
    result_backend = os.getenv("CELERY_RESULT_BACKEND", _broker)
    task_ignore_result = False
    result_extended = False

# TLS for broker/result (Heroku Redis supports CA‑signed certs; you can set 'required')
_use_ssl = os.getenv("CELERY_BROKER_USE_SSL", "1") == "1"
_cert_reqs = os.getenv("CELERY_SSL_CERT_REQS", "none")   # 'required' if you want strict verify
_ssl_cfg = {"ssl_cert_reqs": _cert_reqs} if _use_ssl else None

broker_use_ssl = _ssl_cfg
redis_backend_use_ssl = _ssl_cfg

# Network resilience on Heroku
broker_transport_options = {
    "visibility_timeout": 60 * 30,
    "socket_keepalive": True,
    "socket_timeout": 5,
    "retry_on_timeout": True,
    "max_connections": 10,
}
result_backend_transport_options = {"retry_on_timeout": True}

app.conf.update(
    # Redis URL from Heroku environment with SSL support
    broker_url=broker_url,
    result_backend=result_backend,
    task_ignore_result=task_ignore_result,
    result_extended=result_extended,
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
    
    # Worker behaviour
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=120,
    task_soft_time_limit=90,
    
    # Task routing for OCR operations
    task_routes={
        'receipts.tasks.process_receipt_task': {'queue': 'ocr_processing'},
        'receipts.tasks.batch_process_receipts': {'queue': 'ocr_batch'},
        'receipts.tasks.cleanup_temp_files': {'queue': 'maintenance'},
    },
    
    # Retry configuration
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Result expiration (only used by workers when result_backend is enabled)
    result_expires=3600,  # 1 hour
    
    # Enhanced Heroku reliability settings
    task_always_eager=False,
    task_eager_propagates=False,
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Avoid crashing at boot if broker is briefly unavailable
    broker_connection_retry_on_startup=True,
    task_reject_on_worker_lost=True,
)
