#!/bin/bash
# Setup Redis and Celery on Heroku for Smart Accounting Backend

echo "🚀 Setting up Redis and Celery for Smart Accounting Backend..."

# Check if we're logged into Heroku
if ! heroku auth:whoami >/dev/null 2>&1; then
    echo "❌ Please login to Heroku first: heroku login"
    exit 1
fi

APP_NAME="smart-backend"

echo "📋 Step 1: Adding Redis add-on..."
heroku addons:create heroku-redis:mini -a $APP_NAME || echo "Redis add-on may already exist"

echo "📋 Step 2: Checking Redis URL configuration..."
REDIS_URL=$(heroku config:get REDIS_URL -a $APP_NAME)
if [ -z "$REDIS_URL" ]; then
    echo "❌ REDIS_URL not found. Redis add-on may not be ready yet."
    echo "   Wait a few minutes and run: heroku config -a $APP_NAME"
    exit 1
else
    echo "✅ REDIS_URL configured: $REDIS_URL"
fi

echo "📋 Step 3: Scaling dynos..."
echo "   - Web dyno (Django): 1"
echo "   - Worker dyno (Celery): 1" 
echo "   - Beat dyno (Celery Beat): 1"

heroku ps:scale web=1 worker=1 beat=1 -a $APP_NAME

echo "📋 Step 4: Checking dyno status..."
heroku ps -a $APP_NAME

echo "📋 Step 5: Checking logs..."
echo "   Web logs:"
heroku logs --tail -a $APP_NAME --dyno web --num 5

echo "   Worker logs:"
heroku logs --tail -a $APP_NAME --dyno worker --num 5

echo "   Beat logs:"
heroku logs --tail -a $APP_NAME --dyno beat --num 5

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📊 What's running:"
echo "   - Web dyno: Handles HTTP requests (Django + DRF)"
echo "   - Worker dyno: Processes OCR tasks asynchronously"  
echo "   - Beat dyno: Manages scheduled tasks (cleanup, etc.)"
echo "   - Redis: Message broker and result backend"
echo ""
echo "💡 Next steps:"
echo "   1. Deploy your updated code: git push heroku main"
echo "   2. Test receipt upload - it should be async now"
echo "   3. Monitor logs: heroku logs --tail -a $APP_NAME"
echo ""
echo "🔍 Useful commands:"
echo "   heroku ps -a $APP_NAME                    # Check dyno status"
echo "   heroku logs -a $APP_NAME --dyno worker   # Worker logs"
echo "   heroku config -a $APP_NAME               # Environment vars"
echo "   heroku redis:info -a $APP_NAME           # Redis stats"
