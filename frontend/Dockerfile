FROM node:20-alpine

# Set work directory
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy all files
COPY . .

# Build the app
ENV NODE_ENV=development

# Start the app
EXPOSE 3000
CMD ["npm", "start"]
