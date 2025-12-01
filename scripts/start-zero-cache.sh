#!/bin/sh
set -e

echo "🚀 Starting Zero Cache initialization..."
echo "📋 Environment:"
echo "   ZERO_UPSTREAM_DB: ${ZERO_UPSTREAM_DB:0:50}..."
echo "   ZERO_REPLICA_FILE: $ZERO_REPLICA_FILE"
echo "   ZERO_LOG_LEVEL: $ZERO_LOG_LEVEL"
echo "   ZERO_AUTH_SECRET set: $([ -n "$ZERO_AUTH_SECRET" ] && echo 'yes' || echo 'NO!')"

# Extract database connection info from the connection string
# Format: postgres://user:password@host:port/database
DB_HOST=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
max_attempts=60
attempt=1

# Wait for PostgreSQL to accept connections (TCP port open)
while [ $attempt -le $max_attempts ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✅ PostgreSQL port $DB_PORT is open!"
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Failed to connect to PostgreSQL after $max_attempts attempts"
    exit 1
  fi
  
  echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
  sleep 2
  attempt=$((attempt + 1))
done

# Brief wait for PostgreSQL to be fully ready
echo "⏳ Waiting 5s for PostgreSQL to fully initialize..."
sleep 5

# Deploy Zero permissions to database
echo "📝 Deploying Zero permissions to database..."
if npx zero-deploy-permissions -p src/schema.ts 2>&1; then
  echo "✅ Permissions deployed successfully!"
else
  echo "⚠️ Permissions deployment had issues (may be OK if already exists)"
fi

# Start zero-cache (production mode - no -p flag, reads schema from DB)
echo "🚀 Starting zero-cache server on port 4848..."
exec npx zero-cache
