#!/bin/bash
# Manual deployment script for backend

echo "Deploying backend to Heroku..."

# Add Heroku remote if not exists
heroku git:remote -a smart-backend-56247d256139

# Deploy backend subtree
git subtree push --prefix=backend heroku main

echo "Backend deployment complete!"
