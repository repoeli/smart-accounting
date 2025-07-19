#!/bin/bash

# Go to the frontend directory
cd /app

# Remove node_modules and package-lock.json
rm -rf node_modules
rm -f package-lock.json

# Install dependencies
npm install

# Start the application
npm start
