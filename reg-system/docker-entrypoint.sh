#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until nc -z -v -w30 postgres 5432; do
  echo "Waiting for database connection..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Note: Migrations are handled by the separate 'migrate' container in production
# In development, run migrations manually with:
# docker exec <container> npx prisma migrate deploy
echo "Skipping automatic migrations (handled by migrate service)"
echo "Database schema should be up-to-date from migration container"

echo "Starting Next.js application..."
exec "$@"
