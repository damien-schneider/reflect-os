#!/bin/sh
set -e

echo "🚀 Starting Zero Cache initialization..."
echo "📋 Environment:"
echo "   ZERO_UPSTREAM_DB: ${ZERO_UPSTREAM_DB:0:50}..."
echo "   ZERO_REPLICA_FILE: $ZERO_REPLICA_FILE"
echo "   ZERO_LOG_LEVEL: $ZERO_LOG_LEVEL"
echo "   ZERO_AUTH_SECRET set: $([ -n "$ZERO_AUTH_SECRET" ] && echo 'yes' || echo 'NO!')"

# Note: Database migrations are handled by the 'migrations' init container
# This service only starts after migrations complete successfully (via depends_on)

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
