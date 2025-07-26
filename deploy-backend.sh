#!/bin/bash
# Manual deployment script for backend

echo "Deploying backend to Heroku..."

# Ensure we're authenticated with 2FA
echo "Checking Heroku authentication..."
heroku auth:whoami || { echo "Please run 'heroku login' first"; exit 1; }

# Remove any existing remotes to avoid conflicts  
git remote remove heroku 2>/dev/null || true
git remote remove heroku-backend 2>/dev/null || true

# Add Heroku remote using the correct app name
echo "Adding Heroku remote for smart-backend..."
heroku git:remote -a smart-backend -r heroku

# Deploy backend subtree using git subtree
echo "Deploying backend/ folder to Heroku app..."
git subtree push --prefix=backend heroku main

echo "✅ Backend deployment complete!"
