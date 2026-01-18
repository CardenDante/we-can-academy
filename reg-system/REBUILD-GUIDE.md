# We Can Academy - Rebuild Guide

## Quick Reference

### When to Rebuild

You need to rebuild the Docker containers when you encounter these errors:
- `Server Action "..." was not found on the server`
- After making code changes to server actions or components
- After updating dependencies in package.json

### Scripts Available

1. **Full Rebuild** (use this for the current error)
   ```bash
   ./rebuild.sh
   ```
   - Stops all containers
   - Rebuilds app container with no cache
   - Starts all services
   - Shows logs

2. **Quick Restart** (faster, use for minor changes)
   ```bash
   ./quick-restart.sh
   ```
   - Just restarts the app container
   - No rebuild required
   - Faster but may not fix server action issues

### Manual Commands

If you prefer to run commands manually:

```bash
# Full rebuild (recommended for server action errors)
docker-compose down
docker-compose build --no-cache app
docker-compose up -d

# Quick restart
docker-compose restart app

# View logs
docker-compose logs -f app

# Check container status
docker-compose ps
```

## Understanding the Error

The error `Server Action "40954bd9b3072b8c75cfa0eb75950370e450cc2b74" was not found` occurs because:

1. **What are Server Actions?**
   - Server Actions are functions that run on the server
   - Each action gets a unique hash ID during build
   - Client components reference these hash IDs

2. **Why the mismatch?**
   - Code changes were made
   - The Docker container still has the old build
   - Client code expects new hash IDs
   - Server has old hash IDs
   - Result: Actions not found

3. **The Fix**
   - Rebuild the Docker container
   - This creates a new production build
   - Server actions get new matching hash IDs
   - Everything works again

## Production Mode

Your app runs in production mode (`NODE_ENV: "production"`), which means:
- Code is pre-compiled and optimized
- Server actions are hashed and cached
- Changes require a full rebuild
- Better performance but less flexible for development

## After Rebuild

Once the rebuild completes:
1. The app will be accessible at http://localhost:3000
2. Try the action that was failing (attendance marking, search, etc.)
3. It should work without the error

## Troubleshooting

If rebuild fails:
```bash
# Clean everything
docker-compose down -v
docker system prune -f

# Rebuild
./rebuild.sh
```

If issues persist:
```bash
# Check logs
docker-compose logs app

# Check container status
docker-compose ps

# Restart database if needed
docker-compose restart postgres
```
