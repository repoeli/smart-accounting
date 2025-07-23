#!/bin/bash

# Smart Accounting - Local Development Setup Script
# This script sets up the development environment without Docker

echo "=== Smart Accounting Local Development Setup ==="

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "Error: Python is not installed. Please install Python 3.11+"
    exit 1
fi

# Check if PostgreSQL is running locally
if ! command -v psql &> /dev/null; then
    echo "Warning: PostgreSQL not found. Using SQLite for development."
    export USE_SQLITE=true
fi

# Navigate to backend directory
cd backend

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Set up environment variables
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
OPENAI_API_KEY=your-openai-api-key
REDIS_URL=redis://localhost:6379/0
EOF
fi

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Create superuser (optional)
echo "Creating superuser (skip if already exists)..."
python manage.py createsuperuser --noinput --username admin --email admin@example.com || true

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "=== Setup Complete ==="
echo "To start the development server:"
echo "  cd backend"
echo "  python manage.py runserver"
echo ""
echo "The API will be available at: http://localhost:8000"
echo "Admin interface: http://localhost:8000/admin"
echo ""
