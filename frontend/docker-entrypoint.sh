#!/bin/sh

echo "Cleaning up any existing node_modules..."
rm -rf node_modules
rm -f package-lock.json

# Check if we should use the minimal package.json
if [ "$USE_MINIMAL_DEPS" = "true" ]; then
  echo "Using minimal package.json..."
  cp package.json.minimal package.json
fi

echo "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

# Explicitly install ajv and ajv-keywords to ensure correct versions if needed
if [ "$USE_MINIMAL_DEPS" != "true" ]; then
  echo "Installing specific versions of ajv and ajv-keywords..."
  npm install --save ajv@8.12.0 ajv-keywords@5.1.0
fi

echo "Starting the development server..."
npm start
