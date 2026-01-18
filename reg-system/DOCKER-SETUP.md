# Docker Setup Guide - WeCanAcademy Registration System

## Overview

The WeCanAcademy Registration System uses Docker for both development and production deployments, optimized to handle **100+ concurrent users** with the following architecture:

### Architecture Components

1. **PostgreSQL (4GB RAM)** - Primary database with connection pooling
2. **PgBouncer** - Connection pooling middleware (reduces connection overhead)
3. **Redis (1GB RAM)** - Session caching and rate limiting
4. **Next.js App** - 2 replicas for load balancing (production)
5. **Network Isolation** - Frontend and backend networks for security

## Quick Start

### Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

**Access Points:**
- Application: [http://localhost:3000](http://localhost:3000)
- Database: Not exposed (internal only for security)
- Redis: Not exposed (internal only)

### Production Environment

```bash
# Create production environment file
cp .env.production.example .env.production

# Edit .env.production and set secure passwords
nano .env.production

# Generate secure passwords
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD
openssl rand -base64 32  # For NEXTAUTH_SECRET

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

**Access Points:**
- Application: Port 3001 (for reverse proxy)
- Database: Not exposed
- Redis: Not exposed

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file (NEVER commit this to Git):

```bash
# Database Credentials
POSTGRES_USER=wecanacademy
POSTGRES_PASSWORD=<SECURE_RANDOM_PASSWORD>
POSTGRES_DB=wecanacademy

# Database URLs
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@pgbouncer:5432/${POSTGRES_DB}?schema=public&pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"

# Redis
REDIS_PASSWORD=<SECURE_RANDOM_PASSWORD>
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"

# Authentication
NEXTAUTH_SECRET=<SECURE_RANDOM_STRING>
NEXTAUTH_URL=https://your-domain.com
```

## Performance Optimizations

### Connection Pooling Configuration

#### PostgreSQL Settings (4GB RAM)
- Max Connections: 200
- Shared Buffers: 1GB
- Effective Cache Size: 3GB
- Work Memory: 10MB

#### PgBouncer Settings
- Pool Mode: Transaction
- Max Client Connections: 1000
- Default Pool Size: 25 per app instance
- Max DB Connections: 100

**Result:** System can handle 100+ concurrent users with efficient connection reuse.

### Redis Caching

Redis is configured for:
- Session storage
- Query result caching
- Rate limiting
- Real-time updates

**Memory:** 1GB with LRU (Least Recently Used) eviction policy.

### Application Scaling

Production configuration runs 2 app replicas:
- CPU: 2 cores per replica
- Memory: 2GB per replica
- Total capacity: 4 cores, 4GB RAM for app layer

## Database Migrations

### Automatic Migrations (Recommended)

Migrations run automatically on container startup:

```bash
# Development
docker-compose up -d
# Migrations run automatically when app starts

# Production
docker-compose -f docker-compose.prod.yml up -d
# Migrations run via dedicated migrate service
```

### Manual Migrations

If you need to run migrations manually:

```bash
# Development
docker exec wecanacademy-app-dev node node_modules/prisma/build/index.js migrate deploy

# Production
docker exec wecanacademy-app-prod node node_modules/prisma/build/index.js migrate deploy
```

## Health Checks

All services include health checks:

### Application Health Check

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-18T10:30:00.000Z",
  "checks": {
    "database": "connected"
  }
}
```

### Container Health Status

```bash
docker-compose ps
```

Look for `(healthy)` status for each service.

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f pgbouncer
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 app
```

### Slow Query Monitoring

The application automatically logs slow queries:

- Queries >1s: Warning log
- Queries >5s: Error log (critical)

View slow queries:
```bash
docker-compose logs app | grep "SLOW QUERY"
```

## Security Best Practices

### 1. Never Expose Database Ports

Both docker-compose files use `expose` instead of `ports` for database services. This keeps PostgreSQL and Redis internal to the Docker network.

❌ **BAD:**
```yaml
postgres:
  ports:
    - "5432:5432"  # Exposed to host!
```

✅ **GOOD:**
```yaml
postgres:
  expose:
    - "5432"  # Internal only
```

### 2. Use Environment Variables

Never hardcode credentials:

```yaml
# BAD
POSTGRES_PASSWORD: "wecanacademy123"

# GOOD
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

### 3. Network Isolation

Services are split into two networks:
- `frontend`: App and external access
- `backend`: Database services (internal: true)

### 4. Password Rotation

Rotate passwords every 90 days:

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update .env.production
# Restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Issue: Migrations Not Running

**Symptom:** Column `(not available)` does not exist errors

**Solution:**
```bash
# Check if Prisma files are in the container
docker exec wecanacademy-app-dev ls -la prisma/

# Run migrations manually
docker exec wecanacademy-app-dev node node_modules/prisma/build/index.js migrate deploy

# Rebuild if needed
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

### Issue: PgBouncer Connection Errors

**Symptom:** `connection refused` or `authentication failed`

**Solution:**
```bash
# Check PgBouncer logs
docker-compose logs pgbouncer

# Verify environment variables
docker exec wecanacademy-pgbouncer-dev env | grep DATABASE_URL

# Restart PgBouncer
docker-compose restart pgbouncer
```

### Issue: High Memory Usage

**Symptom:** Containers using more memory than expected

**Solution:**
```bash
# Check memory usage
docker stats

# Adjust resource limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G  # Adjust as needed
```

### Issue: Slow Performance

**Symptoms:** Slow page loads, timeouts

**Diagnostics:**
```bash
# Check slow queries
docker-compose logs app | grep "SLOW QUERY"

# Check connection pool
docker exec wecanacademy-pgbouncer-dev cat /etc/pgbouncer/pgbouncer.ini

# Check PostgreSQL connections
docker exec wecanacademy-db-dev psql -U wecanacademy -c "SELECT count(*) FROM pg_stat_activity;"
```

## Resource Requirements

### Minimum Requirements (Development)
- CPU: 4 cores
- RAM: 8GB
- Disk: 20GB

### Recommended Requirements (Production - 100 users)
- CPU: 8 cores
- RAM: 16GB
- Disk: 50GB SSD
- Network: 1Gbps

### Estimated Costs
- VPS (Hetzner, DigitalOcean): ~$80-100/month
- AWS EC2 (t3.xlarge): ~$120/month
- Google Cloud (e2-standard-4): ~$100/month

## Backup and Recovery

### Database Backups

Automated backups (configure externally):

```bash
# Manual backup
docker exec wecanacademy-db-prod pg_dump -U wecanacademy wecanacademy > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i wecanacademy-db-prod psql -U wecanacademy wecanacademy < backup_20260118_103000.sql
```

### Volume Backups

```bash
# Backup Docker volumes
docker run --rm -v wecanacademy_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data_backup.tar.gz /data

# Restore Docker volumes
docker run --rm -v wecanacademy_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data_backup.tar.gz -C /
```

## Scaling Beyond 100 Users

### Horizontal Scaling (200+ users)

1. **Increase app replicas:**
```yaml
deploy:
  replicas: 4  # Increase from 2
```

2. **Add load balancer (Nginx):**
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
  depends_on:
    - app
```

3. **Increase PostgreSQL resources:**
```yaml
postgres:
  deploy:
    resources:
      limits:
        cpus: '8'
        memory: 8G
```

### Vertical Scaling (500+ users)

Consider managed services:
- AWS RDS for PostgreSQL
- AWS ElastiCache for Redis
- AWS ECS/EKS for containers

## Production Checklist

Before deploying to production:

- [ ] Set all environment variables in `.env.production`
- [ ] Generate strong random passwords (32+ characters)
- [ ] Remove hardcoded credentials from docker-compose files
- [ ] Verify database ports are NOT exposed to host
- [ ] Enable automatic backups
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable HTTPS with SSL certificates
- [ ] Test health check endpoint
- [ ] Run load testing (100+ concurrent users)
- [ ] Set up log aggregation
- [ ] Configure alerting for errors
- [ ] Document rollback procedure

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- View running containers: `docker-compose ps`
- Restart services: `docker-compose restart`
- Full reset: `docker-compose down -v && docker-compose up -d`
