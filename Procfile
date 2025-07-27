# Heroku Deployment - Enhanced Receipt Processing System

# Web dyno with optimized settings for receipt processing
web: cd backend && gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --worker-class gthread --threads 2 --preload --max-requests 1200 --max-requests-jitter 50 --timeout 120 --log-level info

# Release phase for database migrations
release: cd backend && python manage.py migrate
