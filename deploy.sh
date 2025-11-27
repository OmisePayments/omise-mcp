#!/bin/bash

# Omise MCP Server Deployment Script
# This script handles the deployment of the Omise MCP Server to various environments

set -e

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="omise-mcp-server"
DOCKER_REGISTRY="ghcr.io"
IMAGE_TAG="${1:-latest}"
ENVIRONMENT="${2:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if required environment variables are set
    if [ -z "$OMISE_SECRET_KEY" ]; then
        log_error "Required environment variables are not set:"
        log_error "  - OMISE_SECRET_KEY"
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

build_image() {
    log_info "Building Docker image..."
    
    docker build \
        --tag "${DOCKER_REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}" \
        --tag "${DOCKER_REGISTRY}/${PROJECT_NAME}:latest" \
        --file Dockerfile \
        .
    
    log_info "Docker image built successfully."
}

push_image() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Pushing Docker image to registry..."
        
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}"
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}:latest"
        
        log_info "Docker image pushed successfully."
    else
        log_info "Skipping image push for non-production environment."
    fi
}

deploy_services() {
    log_info "Deploying services for environment: $ENVIRONMENT"
    
    # Load environment-specific configuration
    if [ -f "config/${ENVIRONMENT}.env" ]; then
        log_info "Loading environment configuration from config/${ENVIRONMENT}.env"
        export $(cat "config/${ENVIRONMENT}.env" | grep -v '^#' | xargs)
    else
        log_warn "Environment configuration file not found: config/${ENVIRONMENT}.env"
    fi
    
    # Deploy using Docker Compose
    docker-compose \
        --env-file "config/${ENVIRONMENT}.env" \
        up -d
    
    log_info "Services deployed successfully."
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for services to start
    sleep 30
    
    # Check if the main service process is running (MCP stdio server doesn't expose HTTP endpoints)
    if pgrep -f "node.*index.js" > /dev/null 2>&1; then
        log_info "Health check passed - service process is running."
    else
        log_error "Health check failed. Service process is not running."
        exit 1
    fi
}

cleanup() {
    log_info "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused images (older than 24 hours)
    docker image prune -a --filter "until=24h" -f
    
    log_info "Cleanup completed."
}

rollback() {
    log_error "Deployment failed. Rolling back..."
    
    # Stop current services
    docker-compose down
    
    # Restore previous version (if available)
    if [ -f "docker-compose.backup.yml" ]; then
        log_info "Restoring previous version..."
        mv docker-compose.backup.yml docker-compose.yml
        docker-compose up -d
    fi
    
    log_info "Rollback completed."
}

# ============================================================================
# Main Deployment Process
# ============================================================================
main() {
    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    
    # Create backup of current configuration
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml docker-compose.backup.yml
    fi
    
    # Run deployment steps
    check_prerequisites
    build_image
    push_image
    deploy_services
    run_health_checks
    cleanup
    
    log_info "Deployment completed successfully!"
}

# ============================================================================
# Error Handling
# ============================================================================
trap 'rollback' ERR

# ============================================================================
# Script Execution
# ============================================================================
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
