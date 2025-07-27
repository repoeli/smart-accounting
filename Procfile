# Heroku Deployment with Performance Optimizations

# Web dyno with enhanced concurrency
web: cd backend && gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --worker-class gevent --worker-connections 1000 --preload --max-requests 1000 --max-requests-jitter 100 --log-level info

# Worker dyno for background OCR processing
worker: cd backend && celery -A backend.celery worker --loglevel=info --concurrency=4 --max-tasks-per-child=100

# Celery beat for scheduled tasks (optional)
beat: cd backend && celery -A backend.celery beat --loglevel=info

# Release phase for migrations
release: python backend/manage.py migrate
