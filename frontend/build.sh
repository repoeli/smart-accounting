#!/bin/bash
# Heroku build script for frontend

echo "Starting frontend build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Install serve for static file serving
echo "Installing serve..."
npm install serve

# Build the React app
echo "Building React application..."
REACT_APP_API_URL=$REACT_APP_API_URL npm run build

echo "Frontend build complete!"

# List build directory contents for verification
echo "Build directory contents:"
ls -la build/
