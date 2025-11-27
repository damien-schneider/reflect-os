#!/bin/sh
set -e

echo "🚀 Starting Zero Cache initialization..."
echo "📋 Environment:"
echo "   ZERO_UPSTREAM_DB: ${ZERO_UPSTREAM_DB:0:50}..."
echo "   ZERO_REPLICA_FILE: $ZERO_REPLICA_FILE"
echo "   ZERO_LOG_LEVEL: $ZERO_LOG_LEVEL"

# Extract database connection info
DB_HOST=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
max_attempts=60
attempt=1

while [ $attempt -le $max_attempts ]; do
  # Simple TCP check using wget
  if wget --spider --quiet --timeout=2 "http://$DB_HOST:$DB_PORT" 2>/dev/null || \
     nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null || \
     timeout 2 sh -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
    echo "✅ PostgreSQL port is open!"
    break
  fi
  
  echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
  sleep 2
  attempt=$((attempt + 1))
done

# Give PostgreSQL a moment to fully initialize
sleep 5

# Deploy Zero permissions to database
echo "📝 Deploying Zero permissions to database..."
if npx zero-deploy-permissions -p src/schema.ts 2>&1; then
  echo "✅ Permissions deployed successfully!"
else
  echo "⚠️ Permissions deployment returned non-zero exit code"
  echo "   This may be normal if permissions already exist"
fi

# Start zero-cache
echo "🚀 Starting zero-cache server..."
echo "   Command: npx zero-cache -p src/schema.ts"
exec npx zero-cache -p src/schema.ts
