#!/bin/bash

# Simple setup script for WeCan Academy using existing gnm_nginx
# This script starts only the app and database, then configures gnm_nginx

echo "=========================================="
echo "WeCan Academy - Simple Setup"
echo "=========================================="

# Step 1: Start WeCan Academy services (app and database only)
echo ""
echo "Step 1: Starting WeCan Academy services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
docker compose -f docker-compose.prod.yml ps

# Step 2: Copy Nginx configuration to gnm_nginx
echo ""
echo "Step 2: Adding WeCan Academy configuration to gnm_nginx..."

# Copy the config file to gnm_nginx container
docker cp gnm-nginx-config.conf gnm_nginx:/etc/nginx/conf.d/wecan.conf

if [ $? -eq 0 ]; then
    echo "✓ Configuration file copied to gnm_nginx"
else
    echo "✗ Failed to copy configuration file"
    echo "You may need to manually copy the file to gnm_nginx"
    exit 1
fi

# Step 3: Test Nginx configuration
echo ""
echo "Step 3: Testing Nginx configuration..."

if docker exec gnm_nginx nginx -t 2>&1; then
    echo "✓ Nginx configuration test passed"
else
    echo "✗ Nginx configuration test failed"
    echo "Please check the configuration and fix any errors"
    exit 1
fi

# Step 4: Setup SSL certificate
echo ""
echo "Step 4: Setting up SSL certificate..."

# Check if gnm_nginx has certbot
CERTBOT_CMD=$(docker exec gnm_nginx which certbot 2>/dev/null)

if [ -n "$CERTBOT_CMD" ]; then
    echo "Found certbot in gnm_nginx container"

    # Request certificate
    docker exec gnm_nginx certbot certonly \
        --webroot \
        -w /var/www/certbot \
        --email admin@iyfkenya.org \
        --agree-tos \
        --no-eff-email \
        -d wecan.iyfkenya.org

    if [ $? -eq 0 ]; then
        echo "✓ SSL certificate obtained successfully"
    else
        echo "✗ Failed to obtain SSL certificate"
        echo "Please check DNS configuration and try again manually"
    fi
else
    echo "Certbot not found in gnm_nginx container"
    echo ""
    echo "Please obtain SSL certificate manually using one of these methods:"
    echo ""
    echo "1. Using certbot on the host:"
    echo "   certbot certonly --webroot -w /var/www/certbot -d wecan.iyfkenya.org"
    echo ""
    echo "2. Using standalone certbot:"
    echo "   docker run -it --rm --name certbot \\"
    echo "     -v '/etc/letsencrypt:/etc/letsencrypt' \\"
    echo "     -v '/var/www/certbot:/var/www/certbot' \\"
    echo "     certbot/certbot certonly --webroot \\"
    echo "     -w /var/www/certbot \\"
    echo "     --email admin@iyfkenya.org \\"
    echo "     --agree-tos \\"
    echo "     -d wecan.iyfkenya.org"
fi

# Step 5: Reload Nginx
echo ""
echo "Step 5: Reloading Nginx..."

docker exec gnm_nginx nginx -s reload

if [ $? -eq 0 ]; then
    echo "✓ Nginx reloaded successfully"
else
    echo "✗ Failed to reload Nginx"
    exit 1
fi

# Final status
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Services:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Your application should now be available at:"
echo "  - http://wecan.iyfkenya.org (redirects to HTTPS)"
echo "  - https://wecan.iyfkenya.org (after SSL setup)"
echo ""
echo "Test the app directly:"
echo "  curl http://localhost:3001/api/auth/session"
echo ""
echo "View logs:"
echo "  - App: docker compose -f docker-compose.prod.yml logs -f app"
echo "  - Database: docker compose -f docker-compose.prod.yml logs -f postgres"
echo "  - Nginx: docker logs -f gnm_nginx"
echo ""
