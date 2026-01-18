#!/bin/bash

# Script to rebuild the We Can Academy Docker containers
# This is needed after code changes to update server actions

echo "======================================"
echo "We Can Academy - Docker Rebuild Script"
echo "======================================"
echo ""

echo "Step 1: Stopping containers..."
docker-compose down

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to stop containers"
    exit 1
fi

echo "✅ Containers stopped successfully"
echo ""

echo "Step 2: Rebuilding app container (no cache)..."
docker-compose build --no-cache app

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to rebuild app container"
    exit 1
fi

echo "✅ App container rebuilt successfully"
echo ""

echo "Step 3: Starting services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to start services"
    exit 1
fi

echo "✅ Services started successfully"
echo ""

echo "======================================"
echo "Rebuild complete!"
echo "======================================"
echo ""
echo "Container status:"
docker-compose ps
echo ""
echo "App logs (Ctrl+C to exit):"
docker-compose logs -f app
