#!/bin/sh
# Zero Cache startup script
# Runs zero-deploy-permissions then starts zero-cache
# Shell script is required here because we need to run two commands sequentially

set -e

# Deploy Zero permissions to database (uploads permission rules)
npx zero-deploy-permissions -p src/schema.ts || echo "⚠️ Permissions deployment had issues (may be OK if already exists)"

# Start zero-cache - use exec to replace shell process for proper signal handling
exec npx zero-cache
