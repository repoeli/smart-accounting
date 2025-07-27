#!/bin/bash
# Heroku release script for database migrations and setup

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating default superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@smartaccounts.me').exists():
    User.objects.create_superuser(
        email='admin@smartaccounts.me',
        username='admin@smartaccounts.me',
        first_name='Admin',
        last_name='User',
        password='temp-admin-password-change-me'
    )
    print('Default superuser created')
else:
    print('Superuser already exists')
" || echo "Superuser creation skipped"

echo "Release script completed successfully!"
