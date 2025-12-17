# Reflect OS Zero

A full-stack application built with [Rocicorp Zero](https://zero.rocicorp.dev), React, Hono, and PostgreSQL. Features real-time sync, authentication, organization management, and optional billing with Polar.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Environment Setup](#environment-setup)
- [Authentication](#authentication)
- [Email Configuration](#email-configuration)
- [Billing & Subscriptions](#billing--subscriptions)
- [Production Deployment](#production-deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker](https://docker.com) for local PostgreSQL
- Node.js 20+ (for some tooling)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/reflect-os-zero.git
cd reflect-os-zero
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings (see [Environment Setup](#environment-setup)).

### 3. Start Development

```bash
bun run dev
```

This command:
1. Starts PostgreSQL in Docker
2. Runs database migrations
3. Starts the Zero cache server
4. Starts the backend API
5. Starts the frontend dev server

Open [http://localhost:5173](http://localhost:5173) to view the app.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│                     (React + Vite + Zero)                       │
│                      localhost:5173                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Zero Cache                                 │
│                   (Real-time Sync Server)                        │
│                      localhost:4848                              │
│                                                                  │
│  • WebSocket connections with clients                            │
│  • SQLite replica for local queries                              │
│  • Forwards mutations to backend                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                   │
│                      (Hono API)                                  │
│                      localhost:3001                              │
│                                                                  │
│  • /api/auth/* - Better Auth (sessions, OAuth)                   │
│  • /api/zero/* - Zero mutations & queries                        │
│  • /api/polar/* - Billing webhooks                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL                                 │
│                      localhost:5430                              │
│                                                                  │
│  • Users, sessions, organizations                                │
│  • Subscriptions and billing data                                │
│  • WAL enabled for Zero replication                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Packages

| Package | Description |
|---------|-------------|
| `apps/web` | React frontend with Zero client |
| `apps/backend` | Hono API server |
| `packages/db` | Drizzle schema and migrations |
| `packages/auth` | Better Auth configuration |
| `packages/polar` | Polar billing integration |
| `packages/email` | Email templates (React Email) |

---

## Environment Setup

Copy `.env.example` to `.env` and configure:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ZERO_UPSTREAM_DB` | PostgreSQL connection string | `postgresql://user:pass@localhost:5430/postgres` |
| `BETTER_AUTH_SECRET` | Session signing secret (32+ chars) | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Your app's public URL | `http://localhost:5173` |
| `VITE_PUBLIC_ZERO_SERVER` | Zero cache WebSocket URL | `http://localhost:4848` |

### Generate Secrets

```bash
# Generate a secure secret
openssl rand -base64 32
```

---

## Authentication

Authentication is handled by [Better Auth](https://better-auth.com) with session cookies.

### Features

- ✅ Email/password authentication
- ✅ Email verification (optional)
- ✅ Password reset
- ✅ Organization management
- ✅ Member invitations
- ✅ Role-based access control

### Configuration

Authentication is configured in `apps/backend/src/auth.ts`. Key settings:

```typescript
// Enable/disable email verification
const requireEmailVerification = !!env.RESEND_API_KEY;

// Session expiration
const sessionMaxAge = 30 * 24 * 60 * 60; // 30 days
```

### Adding OAuth Providers

To add OAuth (Google, GitHub, etc.), update `apps/backend/src/auth.ts`:

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  // ... existing config
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

---

## Email Configuration

Email is **optional**. Without it:
- Users are auto-verified on signup
- Password reset URLs log to console
- Invitation URLs log to console

### Enable Email with Resend

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key
4. Update `.env`:

```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
EMAIL_FROM_NAME="Your App Name"
VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION="true"
```

### Email Templates

Templates are in `packages/email/emails/`. To preview:

```bash
bun run email:dev
```

---

## Billing & Subscriptions

Billing uses [Polar](https://polar.sh) for subscription management.

### Features

- ✅ Subscription tiers (Free, Pro, Team)
- ✅ Monthly and yearly billing
- ✅ Organization member limits per tier
- ✅ Build-time validation of products
- ✅ Webhook processing

### Enable Billing

1. Create account at [polar.sh](https://polar.sh)
2. Create products (see [Product Setup](#product-setup))
3. Create access token at Settings → Tokens
4. Configure webhooks (see [Webhook Setup](#webhook-setup))
5. Update `.env`:

```env
POLAR_ENVIRONMENT="sandbox"  # or "production"
POLAR_ACCESS_TOKEN="polar_xxxxxxxxxxxxx"
POLAR_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
```

### Product Setup

Create these products in Polar Dashboard:

| Product Name | Description |
|--------------|-------------|
| **Pro Monthly** | Pro tier, monthly billing |
| **Pro Yearly** | Pro tier, yearly billing |
| **Team Monthly** | Team tier, monthly billing |
| **Team Yearly** | Team tier, yearly billing |

> ⚠️ **Important**: Product names must include the tier name ("Pro" or "Team"). Build validation will fail if products are missing.

### Webhook Setup

1. Go to Polar Dashboard → Webhooks
2. Create webhook with URL: `https://yourdomain.com/api/polar/webhooks`
3. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.active`
   - `subscription.canceled`
   - `subscription.revoked`
4. Copy webhook secret to `POLAR_WEBHOOK_SECRET`

### Subscription Tiers

Tiers are configured in `packages/polar/src/tiers.ts`:

```typescript
export const PLAN_LIMITS = {
  free: {
    boards: 1,
    membersPerOrg: 3,
    feedbackPerBoard: 100,
  },
  pro: {
    boards: 5,
    membersPerOrg: 10,
    feedbackPerBoard: 1000,
  },
  team: {
    boards: 20,
    membersPerOrg: 50,
    feedbackPerBoard: 5000,
  },
};
```

### Adding a New Tier

1. Add tier to `SubscriptionTier` type
2. Add to `PAID_TIERS` array
3. Add display config to `PLAN_TIERS`
4. Add limits to `PLAN_LIMITS`
5. Create products in Polar: `{TierName} Monthly` and `{TierName} Yearly`

### Build Validation

When `POLAR_ACCESS_TOKEN` is set, `bun run build` validates:
- All paid tiers have Polar products
- Products match naming convention

Skip validation with:
```bash
POLAR_SKIP_VALIDATION=true bun run build
# or
bun run build:skip-validation
```

---

## Production Deployment

### Docker Compose

The project includes production-ready Docker Compose files:

- `docker-compose.yaml` - Production (requires env vars)
- `docker-compose.local.yaml` - Local testing

### Deploy with Dokploy/Coolify

1. Set environment variables in the UI:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | ✅ | Database password |
| `BETTER_AUTH_SECRET` | ✅ | Auth secret (32+ chars) |
| `ZERO_AUTH_SECRET` | ✅ | Zero auth secret |
| `PUBLIC_URL` | ✅ | Your app URL (https://yourdomain.com) |
| `ZERO_SERVER_URL` | ✅ | Zero cache URL (https://zero.yourdomain.com) |
| `RESEND_API_KEY` | Optional | For email features |
| `POLAR_ACCESS_TOKEN` | Optional | For billing features |

2. Configure domains:
   - `yourdomain.com` → web:3000
   - `api.yourdomain.com` → backend:3001
   - `zero.yourdomain.com` → zero-cache:4848
   - `drizzle.yourdomain.com` → drizzle-gateway:4983 (optional)

3. Deploy!

### Database Management

Access Drizzle Gateway at `https://drizzle.yourdomain.com`:
- Host: `postgres` (Docker network hostname)
- Port: `5432`
- Database: `reflect`
- User: `reflect_user` (or your `POSTGRES_USER`)
- Password: Your `POSTGRES_PASSWORD`

---

## Development

### Commands

```bash
# Start everything
bun run dev

# Individual services
bun run dev:web       # Frontend only
bun run dev:backend   # Backend only
bun run dev:zero-cache # Zero cache only

# Database
bun run db:push       # Push schema changes
bun run db:studio     # Open Drizzle Studio
bun run db:generate   # Generate migrations
bun run db:migrate    # Run migrations

# Testing
bun run test          # Unit tests
bun run e2e           # End-to-end tests

# Code quality
bunx ultracite check  # Lint check
bunx ultracite fix    # Auto-fix lint issues
bun run check-types   # TypeScript check
```

### Project Structure

```
.
├── apps/
│   ├── backend/         # Hono API server
│   │   └── src/
│   │       ├── auth.ts  # Better Auth config
│   │       ├── routes/  # API routes
│   │       └── server.ts
│   └── web/             # React frontend
│       └── src/
│           ├── schema.ts # Zero schema
│           └── components/
├── packages/
│   ├── auth/            # Auth configuration package
│   ├── db/              # Drizzle schema & migrations
│   ├── email/           # Email templates
│   ├── errors/          # Shared error types
│   └── polar/           # Billing integration
├── scripts/
│   └── validate-polar.ts # Build-time validation
└── docker-compose*.yaml
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.dev.yaml ps

# View logs
docker compose -f docker-compose.dev.yaml logs postgres

# Restart database
bun run docker:clean && bun run docker:start
```

### Zero Cache Issues

```bash
# Clean replica file
bun run zero:clean

# Check Zero logs
docker compose -f docker-compose.dev.yaml logs zero-cache
```

### Build Failures

**"Polar validation failed"**
- Ensure Polar products exist with correct names
- Or skip validation: `POLAR_SKIP_VALIDATION=true bun run build`

**"POSTGRES_PASSWORD is required"**
- Set required env vars for docker-compose.yaml
- Use docker-compose.local.yaml for local testing

### Email Not Sending

1. Verify `RESEND_API_KEY` is set
2. Check domain is verified in Resend
3. Check backend logs for errors

---

## License

[MIT License](LICENSE)
