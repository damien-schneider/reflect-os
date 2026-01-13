#!/bin/bash
# Development setup script - runs before Turbo dev
# This handles all the blocking setup tasks so Turbo can run cleanly

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up development environment...${NC}"

# 1. Kill any stale processes on dev ports
echo -e "${YELLOW}   Cleaning up stale processes...${NC}"
lsof -ti:4848,4849,5173,3001 2>/dev/null | xargs kill -9 2>/dev/null || true

# 2. Start PostgreSQL via Docker
echo -e "${YELLOW}   Starting PostgreSQL...${NC}"
docker compose --profile dev up -d --remove-orphans

# 3. Wait for PostgreSQL to be healthy
MAX_TRIES=30
TRIES=0
echo -e "${YELLOW}   Waiting for PostgreSQL to be ready...${NC}"

while [ $TRIES -lt $MAX_TRIES ]; do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' reflect-dev-postgres 2>/dev/null || echo "not_found")
  
  if [ "$HEALTH" = "healthy" ]; then
    echo -e "${GREEN}   ✅ PostgreSQL is ready!${NC}"
    break
  fi
  
  TRIES=$((TRIES + 1))
  sleep 1
done

if [ "$HEALTH" != "healthy" ]; then
  echo "❌ PostgreSQL did not become ready in time"
  exit 1
fi

# 4. Push database schema (non-interactive)
echo -e "${YELLOW}   Pushing database schema...${NC}"
bun run db:push:dev 2>&1 | head -20

# 5. Deploy Zero permissions
echo -e "${YELLOW}   Deploying Zero permissions...${NC}"
bun run zero:deploy-permissions 2>/dev/null || true

echo -e "${GREEN}✅ Setup complete! Starting dev servers...${NC}"
echo ""
