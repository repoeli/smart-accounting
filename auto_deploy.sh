#!/bin/bash

# Smart Accounting - Automated Deployment Script
# This script performs the essential deployment steps

set -e  # Exit on any error

echo "🚀 Smart Accounting - Automated Deployment"
echo "=========================================="

# Use a default app name
APP_NAME="smart-accounting-$(date +%s)"
echo "📱 Creating app: $APP_NAME"

# Check if we can create the app
echo "🆕 Creating Heroku app..."
heroku create $APP_NAME --region us

# Add PostgreSQL addon
echo "🗄️  Adding PostgreSQL addon..."
heroku addons:create heroku-postgresql:mini -a $APP_NAME

# Set basic environment variables (you'll need to set the API keys manually)
echo "🔧 Setting basic environment variables..."
heroku config:set \
    DEBUG="False" \
    DJANGO_SETTINGS_MODULE="backend.settings" \
    DJANGO_LOG_LEVEL="INFO" \
    OPENAI_MODEL="gpt-4o" \
    -a $APP_NAME

echo "⚠️  IMPORTANT: You need to set these environment variables manually:"
echo "   heroku config:set OPENAI_API_KEY=your_key -a $APP_NAME"
echo "   heroku config:set CLOUDINARY_CLOUD_NAME=your_name -a $APP_NAME"
echo "   heroku config:set CLOUDINARY_API_KEY=your_key -a $APP_NAME"
echo "   heroku config:set CLOUDINARY_API_SECRET=your_secret -a $APP_NAME"
echo "   heroku config:set SECRET_KEY=your_secret_key -a $APP_NAME"

# Set Heroku remote
heroku git:remote -a $APP_NAME

# Deploy
echo "🚀 Deploying to Heroku..."
git push heroku main

# Run migrations
echo "🗄️  Running database migrations..."
heroku run python backend/manage.py migrate -a $APP_NAME

# Get app URL
APP_URL="https://$APP_NAME.herokuapp.com/"

echo ""
echo "🎉 Deployment completed!"
echo "========================"
echo "📱 App Name: $APP_NAME"
echo "🌐 App URL: $APP_URL"
echo ""
echo "🔧 Next steps:"
echo "1. Set your API keys using the commands shown above"
echo "2. Test the deployment: curl ${APP_URL}api/receipts/"
echo "3. Monitor logs: heroku logs --tail -a $APP_NAME"
