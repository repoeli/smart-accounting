#!/bin/bash

# Smart Accounting - Heroku Deployment Script
# This script automates the deployment process to Heroku

set -e  # Exit on any error

echo "🚀 Smart Accounting - Heroku Deployment Script"
echo "=============================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first."
    echo "   Visit: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    heroku login
fi

# Get app name from user or use default
read -p "Enter your Heroku app name (or press Enter for 'smart-accounting-backend'): " APP_NAME
APP_NAME=${APP_NAME:-smart-accounting-backend}

echo "📱 Using app name: $APP_NAME"

# Check if app exists, create if it doesn't
if heroku apps:info $APP_NAME &> /dev/null; then
    echo "✅ App $APP_NAME already exists"
else
    echo "🆕 Creating new Heroku app: $APP_NAME"
    heroku create $APP_NAME
fi

# Add Heroku Postgres if not already added
echo "🗄️  Checking for database addon..."
if heroku addons -a $APP_NAME | grep -q "heroku-postgresql"; then
    echo "✅ PostgreSQL addon already exists"
else
    echo "🆕 Adding PostgreSQL addon..."
    heroku addons:create heroku-postgresql:mini -a $APP_NAME
fi

# Set environment variables
echo "🔧 Setting environment variables..."

# Check if critical env vars are set locally
if [[ -z "$OPENAI_API_KEY" ]]; then
    read -p "🔑 Enter your OpenAI API Key: " OPENAI_API_KEY
fi

if [[ -z "$CLOUDINARY_CLOUD_NAME" ]]; then
    read -p "☁️  Enter your Cloudinary Cloud Name: " CLOUDINARY_CLOUD_NAME
fi

if [[ -z "$CLOUDINARY_API_KEY" ]]; then
    read -p "🔑 Enter your Cloudinary API Key: " CLOUDINARY_API_KEY
fi

if [[ -z "$CLOUDINARY_API_SECRET" ]]; then
    read -p "🔒 Enter your Cloudinary API Secret: " CLOUDINARY_API_SECRET
fi

# Generate a secure secret key if not provided
if [[ -z "$SECRET_KEY" ]]; then
    SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
fi

# Set all environment variables
heroku config:set \
    OPENAI_API_KEY="$OPENAI_API_KEY" \
    OPENAI_MODEL="gpt-4o" \
    CLOUDINARY_CLOUD_NAME="$CLOUDINARY_CLOUD_NAME" \
    CLOUDINARY_API_KEY="$CLOUDINARY_API_KEY" \
    CLOUDINARY_API_SECRET="$CLOUDINARY_API_SECRET" \
    SECRET_KEY="$SECRET_KEY" \
    DEBUG="False" \
    DJANGO_SETTINGS_MODULE="backend.settings" \
    DJANGO_LOG_LEVEL="INFO" \
    -a $APP_NAME

echo "✅ Environment variables set successfully"

# Set Heroku remote if not exists
if ! git remote | grep -q "heroku"; then
    heroku git:remote -a $APP_NAME
    echo "✅ Heroku remote added"
else
    echo "✅ Heroku remote already exists"
fi

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Production deployment - $(date)" || echo "No changes to commit"
git push heroku main

# Run database migrations
echo "🗄️  Running database migrations..."
heroku run python backend/manage.py migrate -a $APP_NAME

# Get the app URL
APP_URL=$(heroku apps:info $APP_NAME --json | python -c "import json, sys; print(json.load(sys.stdin)['web_url'])")

echo ""
echo "🎉 Deployment completed successfully!"
echo "=============================================="
echo "📱 App Name: $APP_NAME"
echo "🌐 App URL: $APP_URL"
echo "📊 Admin URL: ${APP_URL}admin/"
echo "📋 API Documentation: ${APP_URL}api/"
echo ""
echo "🔧 Useful commands:"
echo "   heroku logs --tail -a $APP_NAME                 # View logs"
echo "   heroku run python backend/manage.py shell -a $APP_NAME   # Django shell"
echo "   heroku ps -a $APP_NAME                          # Check dynos"
echo "   heroku config -a $APP_NAME                      # View env vars"
echo ""
echo "🧪 Test your deployment:"
echo "   curl ${APP_URL}api/receipts/"
echo ""
echo "✨ Happy coding!"
