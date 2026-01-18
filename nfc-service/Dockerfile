# NFC Service Dockerfile for ACR122U Reader

FROM node:20-alpine

# Install build dependencies for native modules
# Note: pcsc-lite is needed for PC/SC support
RUN apk add --no-cache \
    build-base \
    python3 \
    pcsc-lite \
    pcsc-lite-dev \
    ccid

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY server.js ./

# Expose port
EXPOSE 3001

# Run the service
CMD ["node", "server.js"]
