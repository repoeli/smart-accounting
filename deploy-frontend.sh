#!/bin/bash
# Manual deployment script for frontend

echo "Deploying frontend to Heroku..."

# Add Heroku remote if not exists
heroku git:remote -a smart-frontend-198661fb5d01

# Deploy frontend subtree
git subtree push --prefix=frontend heroku main

echo "Frontend deployment complete!"
