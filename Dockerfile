# Omise MCP Server Dockerfile
# Multi-stage build for production optimization

# ============================================================================
# Build Stage
# ============================================================================
FROM node:20-alpine AS builder

# Security: Build as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S omise -u 1001

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# ============================================================================
# Production Stage
# ============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies and create non-root user
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S omise -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=omise:nodejs package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=omise:nodejs /app/dist ./dist

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R omise:nodejs /app/logs

# Switch to non-root user for security
USER omise

# Note: This is an MCP stdio server, not an HTTP server

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# Security: Limit memory usage
ENV NODE_OPTIONS="--max-old-space-size=512"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the MCP server
CMD ["node", "dist/index.js"]
