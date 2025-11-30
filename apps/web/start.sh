#!/bin/sh
set -e

echo "🚀 Starting Reflect OS Zero..."
echo "📋 Environment:"
echo "   NODE_ENV: ${NODE_ENV:-development}"
echo "   PORT: ${PORT:-3000}"
echo "   DATABASE_URL: ${DATABASE_URL:0:50}..."

# Run database migrations
echo "📦 Running database migrations..."
cd /app/packages/db

migration_attempts=3
migration_attempt=1

while [ $migration_attempt -le $migration_attempts ]; do
  if npx drizzle-kit migrate 2>&1; then
    echo "✅ Migrations applied successfully!"
    break
  else
    if [ $migration_attempt -eq $migration_attempts ]; then
      echo "⚠️ Migrations failed after $migration_attempts attempts"
      echo "   This may be normal if database is not ready or migrations already applied"
      break
    fi
    echo "⏳ Migration failed, retrying in 5s... (attempt $migration_attempt/$migration_attempts)"
    sleep 5
    migration_attempt=$((migration_attempt + 1))
  fi
done

# Start the server
cd /app
echo "✅ Starting web server on port ${PORT:-3000}..."
exec bun run server.ts
