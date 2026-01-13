# Development Guide

Get Reflect OS running locally in under 5 minutes.

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker](https://docker.com) for PostgreSQL

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/reflect-os-zero.git
cd reflect-os-zero
bun install

# 2. Setup environment
cp .env.example .env

# 3. Start everything
bun run dev
```

That's it! Open [http://localhost:5173](http://localhost:5173).

## What `bun run dev` Does

1. **Runs `scripts/dev-setup.sh`** which:
   - Kills stale processes on dev ports (4848, 4849, 5173, 3001)
   - Starts PostgreSQL via Docker (port 5430)
   - Waits for DB to be healthy
   - Pushes database schema using Drizzle
   - Deploys Zero permissions

2. **Starts Turbo TUI** with parallel tasks:
   - `@repo/web#dev` → Vite dev server (port 5173)
   - `@repo/web#dev:zero-cache` → Zero sync server (port 4848)
   - `@repo/backend#dev` → Hono API server (port 3001)

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start everything (setup + Turbo TUI) |
| `bun run dev:setup` | Run setup only (DB, schema, permissions) |
| `bun run dev:servers` | Start Turbo TUI only (skip setup) |
| `bun run dev:stop` | Stop Docker + kill dev processes |
| `bun run dev:clean` | Full reset: DB, Zero replica, processes |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:push:dev` | Push schema changes |
| `bun run zero:deploy-permissions` | Update Zero permissions |
| `bun run test` | Run unit tests |
| `bun run e2e` | Run E2E tests |
| `bunx ultracite check` | Lint code |
| `bunx ultracite fix` | Auto-fix lint issues |

## Project Structure

```
reflect-os-zero/
├── apps/
│   ├── web/          # React frontend (Vite + TanStack Router)
│   └── backend/      # Hono API server
├── packages/
│   ├── db/           # Drizzle schema & migrations
│   ├── auth/         # Shared auth utilities
│   ├── email/        # React Email templates
│   ├── polar/        # Billing integration
│   └── ui/           # Shared UI components
└── docs/             # Documentation
```

## Environment Variables

The `.env.example` file contains all variables with sensible defaults for development.

### Required for Development

| Variable | Default | Description |
|----------|---------|-------------|
| `ZERO_UPSTREAM_DB` | `postgresql://user:password@127.0.0.1:5430/postgres` | PostgreSQL connection |
| `BETTER_AUTH_SECRET` | (dev value) | Session signing secret |
| `BETTER_AUTH_URL` | `http://localhost:5173` | App public URL |
| `VITE_PUBLIC_ZERO_SERVER` | `http://localhost:4848` | Zero WebSocket URL |

### Optional Features

| Feature | Variables Needed |
|---------|-----------------|
| **Email** | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` |
| **Billing** | `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` |

## Database Management

```bash
# Open Drizzle Studio (visual database browser)
bun run db:studio

# Push schema changes (no migration file)
bun run db:push:dev

# Generate migration from schema changes
bun run db:generate

# Run pending migrations
bun run db:migrate
```

## Testing

```bash
# Unit tests
bun run test
bun run test:watch

# E2E tests (requires running app)
bun run e2e
bun run e2e:ui      # With Playwright UI
bun run e2e:headed  # In browser window
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose --profile dev ps

# View logs
bun run docker:logs

# Full reset
bun run dev:clean
bun run dev
```

### Zero Cache Issues

```bash
# Clean local replica
bun run zero:clean

# Restart dev (will recreate replica)
bun run dev
```

### Port Conflicts

The dev script **automatically kills processes** on required ports before starting. If you still have issues:

```bash
# Manual cleanup
bun run dev:kill-ports

# The app uses these ports:
# 5173 - Vite (frontend)
# 4848 - Zero cache (main)
# 4849 - Zero cache (internal)
# 3001 - Backend API
# 5430 - PostgreSQL
```

### Build Failures

**"Polar validation failed"**
```bash
# Skip validation (for development without billing)
POLAR_SKIP_VALIDATION=true bun run build
```

**TypeScript errors after schema changes**
```bash
# Regenerate types
bun run db:generate
```

## Code Quality

The project uses [Ultracite](https://github.com/haydenbleasel/ultracite) (Biome-based) for linting and formatting:

```bash
# Check for issues
bunx ultracite check

# Auto-fix issues
bunx ultracite fix
```

Key rules:
- Use `const` by default, `let` only when needed
- Prefer arrow functions for callbacks
- Use `for...of` over `.forEach()`
- Always `await` promises in async functions
- Use semantic HTML and ARIA attributes
