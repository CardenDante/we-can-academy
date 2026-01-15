#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until nc -z -v -w30 postgres 5432; do
  echo "Waiting for database connection..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Skip migrations in production - run them manually or in CI/CD
# Migrations require full Prisma CLI which increases image size significantly
echo "Skipping migrations (should be run manually or in CI/CD)..."
echo "To run migrations: docker exec wecanacademy-app npx prisma migrate deploy"

echo "Starting Next.js application..."
exec "$@"
