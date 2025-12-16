#!/bin/sh
# Wait for PostgreSQL to be ready
# Uses Docker healthcheck as the source of truth

set -e

MAX_TRIES=30
TRIES=0

echo "⏳ Waiting for PostgreSQL to be ready..."

while [ $TRIES -lt $MAX_TRIES ]; do
  # Check if the postgres container is healthy
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' reflect-dev-postgres 2>/dev/null || echo "not_found")
  
  if [ "$HEALTH" = "healthy" ]; then
    echo "✅ PostgreSQL is ready!"
    exit 0
  fi
  
  TRIES=$((TRIES + 1))
  echo "   Attempt $TRIES/$MAX_TRIES - Status: $HEALTH"
  sleep 1
done

echo "❌ PostgreSQL did not become ready in time"
exit 1
