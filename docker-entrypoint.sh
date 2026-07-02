#!/bin/sh
set -e

echo "Running Prisma database push..."
DATABASE_URL="$DATABASE_URL" npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss

echo "Starting Next.js..."
exec node server.js
