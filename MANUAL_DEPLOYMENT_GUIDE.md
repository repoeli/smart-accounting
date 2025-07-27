# 🚀 Manual Deployment Guide for Smart Accounting

Since the automated Heroku CLI seems to be hanging, here's a step-by-step manual deployment guide:

## Prerequisites ✅
- [x] Heroku CLI installed
- [x] Git repository ready
- [x] Clean production code committed

## Step 1: Login to Heroku
```bash
heroku login
```
*This will open a browser window for authentication*

## Step 2: Create Heroku App
```bash
heroku create smart-acc-backend
```
*Or use any name you prefer (max 30 characters)*

## Step 3: Add PostgreSQL Database
```bash
heroku addons:create heroku-postgresql:mini -a smart-acc-backend
```

## Step 4: Set Environment Variables
**CRITICAL:** Set these environment variables on Heroku:

```bash
# Replace 'smart-acc-backend' with your actual app name
APP_NAME="smart-acc-backend"

# Set basic config
heroku config:set DEBUG="False" -a $APP_NAME
heroku config:set DJANGO_SETTINGS_MODULE="backend.settings" -a $APP_NAME
heroku config:set DJANGO_LOG_LEVEL="INFO" -a $APP_NAME
heroku config:set OPENAI_MODEL="gpt-4o" -a $APP_NAME

# Generate a secret key
heroku config:set SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" -a $APP_NAME

# Set your API keys (YOU MUST REPLACE THESE WITH REAL VALUES)
heroku config:set OPENAI_API_KEY="your-openai-api-key-here" -a $APP_NAME
heroku config:set CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name" -a $APP_NAME
heroku config:set CLOUDINARY_API_KEY="your-cloudinary-api-key" -a $APP_NAME
heroku config:set CLOUDINARY_API_SECRET="your-cloudinary-api-secret" -a $APP_NAME
```

## Step 5: Add Heroku Remote
```bash
heroku git:remote -a smart-acc-backend
```

## Step 6: Deploy to Heroku
```bash
git push heroku main
```

## Step 7: Run Database Migrations
```bash
heroku run python backend/manage.py migrate -a smart-acc-backend
```

## Step 8: Create Superuser (Optional)
```bash
heroku run python backend/manage.py createsuperuser -a smart-acc-backend
```

## Step 9: Test the Deployment

### Check if app is running:
```bash
heroku ps -a smart-acc-backend
```

### View logs:
```bash
heroku logs --tail -a smart-acc-backend
```

### Test API endpoints:
```bash
# Get your app URL
heroku info -a smart-acc-backend

# Test basic endpoint (replace with your actual URL)
curl https://smart-acc-backend.herokuapp.com/api/receipts/
```

## Step 10: Test Receipt Upload

Once deployed, you can test the receipt processing by:

1. **Admin Interface**: Visit `https://your-app-name.herokuapp.com/admin/`
2. **API Testing**: Use the REST API endpoints:
   - `GET /api/receipts/` - List receipts
   - `POST /api/receipts/` - Upload and process receipt
   - `GET /api/receipts/{id}/` - Get receipt details

## Common Issues & Solutions

### Issue: Build fails with missing dependencies
**Solution**: Ensure `requirements.txt` is in the root directory

### Issue: Static files not loading
**Solution**: Run `heroku run python backend/manage.py collectstatic --noinput`

### Issue: Database connection errors
**Solution**: Check that `DATABASE_URL` is automatically set by the PostgreSQL addon

### Issue: OpenAI API errors
**Solution**: Verify your `OPENAI_API_KEY` is set correctly

### Issue: Cloudinary upload fails
**Solution**: Verify all Cloudinary environment variables are set

## Monitoring Your App

```bash
# View recent logs
heroku logs -n 100 -a smart-acc-backend

# Monitor in real-time
heroku logs --tail -a smart-acc-backend

# Check app metrics
heroku ps -a smart-acc-backend

# View config vars
heroku config -a smart-acc-backend
```

## 🎯 Expected Result

After successful deployment, your Smart Accounting backend will be live at:
`https://smart-acc-backend.herokuapp.com/`

The system will provide:
- ✅ Receipt upload API endpoints
- ✅ OpenAI GPT-4o Vision OCR processing
- ✅ Cloudinary image storage
- ✅ Background processing via ThreadPoolExecutor
- ✅ PostgreSQL database storage
- ✅ Django admin interface

## 🚀 Ready to Deploy!

Your codebase is production-ready. Follow these steps and your Smart Accounting system will be live on Heroku!
