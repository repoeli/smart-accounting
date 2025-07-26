#!/bin/bash
# Deploy by pushing to GitHub (triggers automatic Heroku deployment)

echo "🚀 Deploying to Heroku via GitHub..."

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo "📝 No changes to commit. Making a deployment trigger commit..."
    echo "# Deployment trigger $(date)" >> .deployment-log
    git add .deployment-log
    git commit -m "Trigger deployment $(date)"
else
    echo "📝 Committing current changes..."
    git add .
    git commit -m "Deploy to Heroku $(date)"
fi

# Push to GitHub (this will trigger automatic Heroku deployment)
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Pushed to GitHub!"
echo "🔄 Heroku will automatically deploy both apps from GitHub"
echo "📊 Check deployment status at:"
echo "   Backend:  https://dashboard.heroku.com/apps/smart-backend/activity"
echo "   Frontend: https://dashboard.heroku.com/apps/smart-frontend/activity"
