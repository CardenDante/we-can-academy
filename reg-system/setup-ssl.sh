#!/bin/bash

# Setup SSL certificates for wecan.iyfkenya.org
# This script obtains SSL certificate and configures gnm_nginx

echo "=========================================="
echo "WeCan Academy - SSL Setup"
echo "=========================================="

# Step 1: Check if wecanacademy-app is running
echo ""
echo "Step 1: Checking if WeCan Academy services are running..."

if ! docker ps | grep -q wecanacademy-app; then
    echo "WeCan Academy app is not running. Starting services..."
    docker compose -f docker-compose.prod.yml up -d
    echo "Waiting for services to be ready..."
    sleep 15
else
    echo "✓ WeCan Academy services are already running"
fi

# Check service status
docker compose -f docker-compose.prod.yml ps

# Step 2: Copy Nginx configuration to gnm_nginx
echo ""
echo "Step 2: Adding WeCan configuration to gnm_nginx..."

if docker ps | grep -q gnm_nginx; then
    docker cp gnm-nginx-config.conf gnm_nginx:/etc/nginx/conf.d/wecan.conf

    if [ $? -eq 0 ]; then
        echo "✓ Configuration file copied to gnm_nginx"
    else
        echo "✗ Failed to copy configuration file"
        exit 1
    fi
else
    echo "✗ gnm_nginx container is not running"
    echo "Please start gnm_nginx first"
    exit 1
fi

# Step 3: Test Nginx configuration (without SSL first)
echo ""
echo "Step 3: Testing Nginx configuration..."

if docker exec gnm_nginx nginx -t 2>&1; then
    echo "✓ Nginx configuration test passed"
else
    echo "✗ Nginx configuration test failed"
    echo "Please check the configuration and fix any errors"
    exit 1
fi

# Reload nginx with HTTP-only config
docker exec gnm_nginx nginx -s reload
echo "✓ Nginx reloaded (HTTP only for now)"

# Step 4: Request SSL certificate
echo ""
echo "Step 4: Requesting SSL certificate from Let's Encrypt..."
echo "This may take a few minutes..."
echo ""

# Check if certificate already exists
if docker exec gnm_nginx ls /etc/letsencrypt/live/wecan.iyfkenya.org/fullchain.pem 2>/dev/null; then
    echo "Certificate already exists!"
    read -p "Do you want to renew it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping certificate renewal"
        CERT_EXISTS=true
    else
        RENEW_FLAG="--force-renewal"
    fi
fi

if [ "$CERT_EXISTS" != "true" ]; then
    # Try to get certificate using certbot in gnm_nginx
    if docker exec gnm_nginx which certbot >/dev/null 2>&1; then
        echo "Using certbot in gnm_nginx container..."
        docker exec gnm_nginx certbot certonly \
            --webroot \
            -w /var/www/certbot \
            --email admin@iyfkenya.org \
            --agree-tos \
            --no-eff-email \
            $RENEW_FLAG \
            -d wecan.iyfkenya.org

        CERT_STATUS=$?
    else
        # Check if certbot is available on host
        if command -v certbot >/dev/null 2>&1; then
            echo "Using certbot on host..."
            certbot certonly \
                --webroot \
                -w /var/www/certbot \
                --email admin@iyfkenya.org \
                --agree-tos \
                --no-eff-email \
                $RENEW_FLAG \
                -d wecan.iyfkenya.org

            CERT_STATUS=$?

            # If successful, copy certificate into gnm_nginx container
            if [ $CERT_STATUS -eq 0 ]; then
                echo "Copying certificate to gnm_nginx container..."
                docker cp /etc/letsencrypt/live/wecan.iyfkenya.org gnm_nginx:/etc/letsencrypt/live/
                docker cp /etc/letsencrypt/archive/wecan.iyfkenya.org gnm_nginx:/etc/letsencrypt/archive/
            fi
        else
            # Use standalone certbot container
            echo "Using standalone certbot container..."

            # Get the letsencrypt volume path from gnm_nginx
            LETSENCRYPT_VOLUME=$(docker inspect gnm_nginx | grep -o '"/[^"]*letsencrypt"' | head -1 | tr -d '"' | cut -d: -f1)

            if [ -z "$LETSENCRYPT_VOLUME" ]; then
                LETSENCRYPT_VOLUME="/etc/letsencrypt"
            fi

            docker run -it --rm --name certbot \
                -v "$LETSENCRYPT_VOLUME:/etc/letsencrypt" \
                -v "/var/www/certbot:/var/www/certbot" \
                certbot/certbot certonly --webroot \
                -w /var/www/certbot \
                --email admin@iyfkenya.org \
                --agree-tos \
                --no-eff-email \
                $RENEW_FLAG \
                -d wecan.iyfkenya.org

            CERT_STATUS=$?
        fi
    fi

    if [ $CERT_STATUS -eq 0 ]; then
        echo ""
        echo "✓ SSL certificate obtained successfully!"
    else
        echo ""
        echo "✗ Failed to obtain SSL certificate"
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check DNS: nslookup wecan.iyfkenya.org"
        echo "   Should return: 159.65.47.81"
        echo ""
        echo "2. Check port 80 is accessible:"
        echo "   curl http://wecan.iyfkenya.org/.well-known/acme-challenge/test"
        echo ""
        echo "3. Check firewall:"
        echo "   sudo ufw status"
        echo ""
        echo "4. Try dry-run first:"
        echo "   docker exec gnm_nginx certbot certonly --webroot -w /var/www/certbot --dry-run -d wecan.iyfkenya.org"
        exit 1
    fi
fi

# Step 5: Verify certificate exists and reload Nginx
echo ""
echo "Step 5: Verifying SSL certificate and reloading Nginx..."

if docker exec gnm_nginx ls /etc/letsencrypt/live/wecan.iyfkenya.org/fullchain.pem >/dev/null 2>&1; then
    echo "✓ SSL certificate found"

    # Test nginx configuration with SSL
    if docker exec gnm_nginx nginx -t 2>&1; then
        echo "✓ Nginx configuration test passed (with SSL)"

        # Reload nginx
        docker exec gnm_nginx nginx -s reload
        echo "✓ Nginx reloaded with SSL configuration"
    else
        echo "✗ Nginx configuration test failed"
        exit 1
    fi
else
    echo "✗ SSL certificate not found in expected location"
    echo "Certificate should be at: /etc/letsencrypt/live/wecan.iyfkenya.org/"
    exit 1
fi

# Step 6: Test the application
echo ""
echo "Step 6: Testing application..."

# Test HTTP redirect
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://wecan.iyfkenya.org 2>/dev/null)
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    echo "✓ HTTP to HTTPS redirect working"
else
    echo "! HTTP redirect returned: $HTTP_RESPONSE (expected 301/302)"
fi

# Test HTTPS
sleep 2
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://wecan.iyfkenya.org 2>/dev/null)
if [ "$HTTPS_RESPONSE" = "200" ]; then
    echo "✓ HTTPS working correctly"
else
    echo "! HTTPS returned: $HTTPS_RESPONSE (expected 200)"
    echo "The app may still be starting up. Try accessing it in a browser."
fi

# Final status
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your application is now available at:"
echo "  🌐 https://wecan.iyfkenya.org"
echo ""
echo "Services Status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Useful commands:"
echo "  - View app logs:      docker compose -f docker-compose.prod.yml logs -f app"
echo "  - View nginx logs:    docker logs -f gnm_nginx"
echo "  - Restart app:        docker compose -f docker-compose.prod.yml restart app"
echo "  - Renew certificate:  docker exec gnm_nginx certbot renew"
echo ""
echo "Certificate auto-renewal:"
echo "  Certificates expire in 90 days. Set up a cron job to renew:"
echo "  0 3 * * * docker exec gnm_nginx certbot renew --quiet && docker exec gnm_nginx nginx -s reload"
echo ""
