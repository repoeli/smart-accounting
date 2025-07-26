#!/bin/bash
# Manual deployment script for frontend

echo "Deploying frontend to Heroku..."

# Ensure we're authenticated with 2FA
echo "Checking Heroku authentication..."
heroku auth:whoami || { echo "Please run 'heroku login' first"; exit 1; }

# Remove any existing remotes to avoid conflicts
git remote remove heroku 2>/dev/null || true  
git remote remove heroku-frontend 2>/dev/null || true

# Add Heroku remote using the correct app name
echo "Adding Heroku remote for smart-frontend..."
heroku git:remote -a smart-frontend -r heroku

# Deploy frontend subtree using git subtree
echo "Deploying frontend/ folder to Heroku app..."
git subtree push --prefix=frontend heroku main

echo "✅ Frontend deployment complete!"
