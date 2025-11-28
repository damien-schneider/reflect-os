#!/bin/sh
set -e

echo "� Starting Reflect OS Zero..."

# Run database migrations
echo "📦 Running database migrations..."
cd /app/packages/db
npx drizzle-kit migrate || echo "⚠️ Migrations failed or already applied"

# Start the server
cd /app
echo "✅ Starting web server on port ${PORT:-3000}..."
exec bun run server.ts
