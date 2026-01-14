# Deployment Guide

Deploy Reflect OS to production using Docker Compose on Dokploy or any self-hosted platform.

## Overview

Reflect OS uses a single `docker-compose.yaml` with profiles:
- **dev** profile: PostgreSQL only (for local development)
- **prod** profile: Full stack for production

## Prerequisites

- Docker & Docker Compose
- Domain with DNS configured
- SSL certificates (Dokploy/Traefik handles this automatically)

## Services Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Your Domain    │     │  Zero Domain     │
│  reflet.app:443  │     │ zero.reflet.app  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│       web        │     │   zero-cache     │
│   (port 3000)    │     │   (port 4848)    │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        │
┌──────────────────┐              │
│     backend      │◄─────────────┘
│   (port 3001)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    PostgreSQL    │
│   (port 5432)    │
└──────────────────┘
```

## Environment Variables

### Required (set in Dokploy UI)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Strong database password | `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET` | Session signing (32+ chars) | `openssl rand -base64 32` |
| `ZERO_AUTH_SECRET` | Zero sync auth secret | `openssl rand -base64 32` |
| `PUBLIC_URL` | Your app's public URL | `https://reflet.app` |
| `ZERO_SERVER_URL` | Zero cache public URL | `https://zero.reflet.app` |
| `RESEND_API_KEY` | Resend API key for email | `re_xxxxx` |
| `EMAIL_FROM_ADDRESS` | Sender email address | `noreply@reflet.app` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `reflect_user` | Database user |
| `ZERO_ADMIN_PASSWORD` | `admin` | Zero inspector password |
| `ZERO_NUM_SYNC_WORKERS` | `2` | Sync worker count |
| `POLAR_ACCESS_TOKEN` | - | Enable billing |
| `POLAR_WEBHOOK_SECRET` | - | Billing webhooks |

## Dokploy Setup

### 1. Create Application

1. Create new application in Dokploy
2. Select "Docker Compose" deployment
3. Point to your repository

### 2. Configure Domains

Configure these domain mappings:

| Service | Domain | Port |
|---------|--------|------|
| `web` | `reflet.app` | 3000 |
| `backend` | `api.reflet.app` | 3001 |
| `zero-cache` | `zero.reflet.app` | 4848 |

### 3. Set Environment Variables

In Dokploy UI, add all required environment variables.

### 4. Deploy

Click deploy. The services will start in order:
1. PostgreSQL (with health check)
2. Migrations (runs once, exits)
3. Backend & Zero-cache (after migrations complete)
4. Web (after backend & zero-cache)

## Manual Docker Deployment

```bash
# Clone repository
git clone https://github.com/your-org/reflect-os-zero.git
cd reflect-os-zero

# Create .env file with production values
cat > .env.prod << EOF
POSTGRES_PASSWORD=your-strong-password
BETTER_AUTH_SECRET=your-auth-secret-32chars
ZERO_AUTH_SECRET=your-zero-secret-32chars
PUBLIC_URL=https://reflet.app
ZERO_SERVER_URL=https://zero.reflet.app
RESEND_API_KEY=re_xxxxx
EMAIL_FROM_ADDRESS=noreply@reflet.app
EOF

# Deploy
docker compose --env-file .env.prod up -d
```

## Database Backups

PostgreSQL data is stored in a named volume `reflect-postgres-data`.

### Manual Backup

```bash
docker exec reflect-postgres pg_dump -U reflect_user reflect > backup.sql
```

### Restore

```bash
docker exec -i reflect-postgres psql -U reflect_user reflect < backup.sql
```

### Dokploy Backups

Dokploy can automatically backup named volumes. Configure in the Dokploy UI under Backup settings.

## Zero Cache Management

### Replica Storage

Zero cache stores its SQLite replica in the `reflect-zero-data` volume. This can be safely deleted—it will resync from PostgreSQL on restart.

### Reset Replica

```bash
# Stop zero-cache
docker compose stop zero-cache

# Remove volume
docker volume rm reflect-zero-data

# Restart
docker compose up -d zero-cache
```

### Inspector Access

Access the Zero inspector at `https://zero.reflet.app/_admin` with the password set in `ZERO_ADMIN_PASSWORD`.

## Scaling Considerations

### Single-Node (Recommended for most cases)

The default `docker-compose.yaml` runs zero-cache as a single instance. This handles thousands of concurrent users.

### Multi-Node (Advanced)

For larger deployments, Zero supports splitting into:
- **Replication Manager** (1 instance): Manages the PostgreSQL replication stream
- **View Syncers** (N instances): Serve client queries

See [Zero's deployment docs](https://zero.rocicorp.dev/docs/deployment) for multi-node setup.

## SSL/TLS

### Dokploy

SSL is automatically handled by Dokploy's built-in Traefik with Let's Encrypt.

### Manual Setup

Use a reverse proxy (nginx, Caddy, Traefik) in front of the Docker services.

Example with Caddy:

```
reflet.app {
    reverse_proxy web:3000
}

api.reflet.app {
    reverse_proxy backend:3001
}

zero.reflet.app {
    reverse_proxy zero-cache:4848
}
```

## Monitoring

### Health Checks

All services expose health endpoints:

| Service | Endpoint |
|---------|----------|
| PostgreSQL | `pg_isready` command |
| Zero-cache | `/keepalive` |
| Backend | `/health` (if implemented) |
| Web | `/` |

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f zero-cache
```

## Troubleshooting

### Migrations Not Running

Check migration logs:
```bash
docker compose logs migrations
```

### Zero-cache Won't Start

1. Check if PostgreSQL is healthy
2. Verify `ZERO_UPSTREAM_DB` connection string
3. Check Zero logs for replication errors

```bash
docker compose logs zero-cache
```

### WebSocket Connection Issues

Ensure your reverse proxy/load balancer supports WebSocket connections. The `zero-cache` service uses WebSockets on port 4848.

### Email Not Sending

1. Verify `RESEND_API_KEY` is correct
2. Check domain verification in Resend dashboard
3. Check backend logs for errors
