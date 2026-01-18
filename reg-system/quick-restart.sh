#!/bin/bash

# Quick restart script for We Can Academy
# Use this for minor changes that don't require a full rebuild

echo "======================================"
echo "We Can Academy - Quick Restart"
echo "======================================"
echo ""

echo "Restarting app container..."
docker-compose restart app

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to restart app"
    exit 1
fi

echo "✅ App restarted successfully"
echo ""

echo "Container status:"
docker-compose ps
echo ""
echo "App logs (Ctrl+C to exit):"
docker-compose logs -f app
