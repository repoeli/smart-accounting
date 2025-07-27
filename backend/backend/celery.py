"""
Celery Configuration for Heroku Deployment
Optimized for receipt OCR background processing
"""
import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('smart_accounting')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Heroku Redis Configuration with SSL support
redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Configure SSL for Heroku Redis (rediss://)
broker_use_ssl = None
broker_transport_options = {}

if redis_url.startswith('rediss://'):
    # Heroku Redis uses SSL, but has self-signed certificates
    # Configure to skip certificate verification
    import ssl
    broker_use_ssl = {
        'ssl_cert_reqs': ssl.CERT_NONE,  # Don't verify certificates
        'ssl_ca_certs': None,
        'ssl_certfile': None,
        'ssl_keyfile': None,
        'ssl_check_hostname': False,  # Don't check hostname
    }
    
    # Also configure transport options
    broker_transport_options = {
        'ssl_cert_reqs': ssl.CERT_NONE,
        'ssl_ca_certs': None,
        'ssl_certfile': None,
        'ssl_keyfile': None,
        'ssl_check_hostname': False,
    }

app.conf.update(
    # Redis URL from Heroku environment with SSL support
    broker_url=redis_url,
    result_backend=redis_url,
    broker_use_ssl=broker_use_ssl,
    broker_transport_options=broker_transport_options,
    redis_backend_use_ssl=broker_use_ssl,
    result_backend_transport_options=broker_transport_options,
    
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
)
