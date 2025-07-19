FROM node:20-alpine

# Set work directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* tsconfig.json ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Copy all files
COPY . .

# Build the app for production, or use development mode
ENV NODE_ENV=development

# Start the app with the simplified version for initial testing
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
