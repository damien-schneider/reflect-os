#!/bin/sh
set -e

echo "🚀 Starting Zero Cache initialization..."
echo "📋 Environment:"
echo "   ZERO_UPSTREAM_DB: ${ZERO_UPSTREAM_DB:0:50}..."
echo "   ZERO_REPLICA_FILE: $ZERO_REPLICA_FILE"
echo "   ZERO_LOG_LEVEL: $ZERO_LOG_LEVEL"

# Extract database connection info from the connection string
# Format: postgres://user:password@host:port/database
DB_HOST=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
max_attempts=120
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

# Give PostgreSQL more time to fully initialize and accept queries
echo "⏳ Waiting additional 10s for PostgreSQL to fully initialize..."
sleep 10

# Verify PostgreSQL is accepting connections by running a simple query
echo "🔍 Verifying PostgreSQL is accepting connections..."
verify_attempts=30
verify_attempt=1

while [ $verify_attempt -le $verify_attempts ]; do
  # Try to connect and run a simple query
  if PGPASSWORD=$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|') \
     psql -h "$DB_HOST" -p "$DB_PORT" \
          -U "$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*://([^:]+):.*|\1|')" \
          -d "$(echo "$ZERO_UPSTREAM_DB" | sed -E 's|.*/([^?]+).*|\1|')" \
          -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is accepting connections!"
    break
  fi
  
  # Fallback: if psql is not available, just wait
  if ! command -v psql > /dev/null 2>&1; then
    echo "⚠️ psql not available, assuming PostgreSQL is ready after port check"
    break
  fi
  
  if [ $verify_attempt -eq $verify_attempts ]; then
    echo "⚠️ PostgreSQL verification timed out, proceeding anyway..."
    break
  fi
  
  echo "⏳ PostgreSQL not ready for queries yet... (verify attempt $verify_attempt/$verify_attempts)"
  sleep 2
  verify_attempt=$((verify_attempt + 1))
done

# Deploy Zero permissions to database
echo "📝 Deploying Zero permissions to database..."
deploy_attempts=5
deploy_attempt=1

while [ $deploy_attempt -le $deploy_attempts ]; do
  if npx zero-deploy-permissions -p src/schema.ts 2>&1; then
    echo "✅ Permissions deployed successfully!"
    break
  else
    if [ $deploy_attempt -eq $deploy_attempts ]; then
      echo "⚠️ Permissions deployment failed after $deploy_attempts attempts"
      echo "   This may be normal if permissions already exist, continuing..."
      break
    fi
    echo "⏳ Permissions deployment failed, retrying... (attempt $deploy_attempt/$deploy_attempts)"
    sleep 5
    deploy_attempt=$((deploy_attempt + 1))
  fi
done

# Start zero-cache
echo "🚀 Starting zero-cache server..."
echo "   Command: npx zero-cache -p src/schema.ts"
exec npx zero-cache -p src/schema.ts
