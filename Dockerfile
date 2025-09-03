# Use Node.js 18 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port (will be overridden by PORT env var)
EXPOSE 3000

# Start the application using the custom server with Socket.IO
CMD ["npm", "run", "start"]
