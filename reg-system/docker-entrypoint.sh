#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until nc -z -v -w30 postgres 5432; do
  echo "Waiting for database connection..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database if needed
echo "Seeding database..."
npx prisma db seed || echo "Seed failed or already seeded"

echo "Starting Next.js application..."
exec "$@"
