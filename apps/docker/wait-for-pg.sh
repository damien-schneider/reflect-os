#!/bin/bash
# Wait for PostgreSQL to be ready

echo "⏳ Waiting for PostgreSQL to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker compose --env-file ../../.env -f ./docker-compose.yml exec -T zstart_postgres pg_isready -U user --dbname=postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    exit 0
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for PostgreSQL... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done

echo "❌ PostgreSQL did not become ready in time"
exit 1
