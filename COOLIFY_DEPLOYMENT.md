# Coolify Deployment Guide

This guide explains how to deploy the Reflect OS Zero application on Coolify.

## Architecture Overview

The application consists of three services:

1. **PostgreSQL** - Database for storing application data
2. **Zero Cache** - Rocicorp Zero sync server for real-time data synchronization  
3. **Web** - Vite/React frontend with Hono API server

## Prerequisites

- A Coolify instance (self-hosted or Coolify Cloud)
- A server connected to Coolify
- Your domain(s) configured in DNS

## Deployment Steps

### 1. Create a New Project in Coolify

1. Log into your Coolify dashboard
2. Click **"+ Add"** → **"Project"**
3. Name your project (e.g., "reflect-os-zero")

### 2. Add the Application

1. Inside your project, click **"+ Add"** → **"Resource"**
2. Select **"Docker Compose"**
3. Choose your source:
   - **GitHub/GitLab**: Connect your repository
   - **Docker Compose (Raw)**: Paste the contents of `docker-compose.coolify.yml`

### 3. Configure Environment Variables

In Coolify's UI, set the following environment variables:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password | `your-secure-password` |
| `ZERO_AUTH_SECRET` | Secret for Zero JWT signing (min 32 chars) | `your-zero-auth-secret-min-32-chars` |
| `BETTER_AUTH_SECRET` | Secret for Better Auth (min 32 chars) | `your-better-auth-secret-min-32-chars` |
| `VITE_PUBLIC_ZERO_SERVER` | Public URL for Zero cache server | `https://zero.yourdomain.com` |
| `VITE_PUBLIC_API_SERVER` | Public URL for web application | `https://app.yourdomain.com` |
| `BETTER_AUTH_URL` | Same as VITE_PUBLIC_API_SERVER | `https://app.yourdomain.com` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `user` |
| `POSTGRES_DB` | PostgreSQL database name | `postgres` |
| `ZERO_LOG_LEVEL` | Zero cache log level | `info` |
| `ZERO_NUM_SYNC_WORKERS` | Number of Zero sync workers | `2` |

### 4. Configure Domains

In Coolify, assign domains to each service:

1. **Web Service**: 
   - Domain: `app.yourdomain.com` (or your chosen domain)
   - Port: `3000`

2. **Zero Cache Service**:
   - Domain: `zero.yourdomain.com` (or your chosen subdomain)
   - Port: `4848`
   
3. **PostgreSQL**: 
   - No public domain needed (internal only)

### 5. Configure SSL

Coolify automatically provisions Let's Encrypt SSL certificates for your domains.
Ensure your domains point to your server's IP address before deploying.

### 6. Deploy

Click **"Deploy"** in Coolify. The deployment will:

1. Build the Docker images
2. Start PostgreSQL and wait for it to be healthy
3. Start Zero Cache and wait for it to be healthy
4. Start the Web application

## Post-Deployment

### Run Database Migrations

After the first deployment, you may need to run database migrations:

1. Go to your **web** service in Coolify
2. Open the **Terminal** tab
3. Run: `bun run db:migrate` (if you have migrations set up)

Or connect directly to PostgreSQL and run migrations manually.

### Verify Deployment

1. Visit your web domain (e.g., `https://app.yourdomain.com`)
2. Check that the application loads
3. Open browser DevTools and verify no WebSocket errors to the Zero server

## Environment Variables Reference

### For Build Time (Vite)

These variables are baked into the frontend during build:

```bash
VITE_PUBLIC_ZERO_SERVER=https://zero.yourdomain.com
VITE_PUBLIC_API_SERVER=https://app.yourdomain.com
```

### For Runtime (Server)

These variables are used by the server at runtime:

```bash
# Database
ZERO_UPSTREAM_DB=postgresql://user:password@postgres:5432/postgres

# Authentication
ZERO_AUTH_SECRET=your-zero-auth-secret
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=https://app.yourdomain.com

# Optional
ZERO_LOG_LEVEL=info
NODE_ENV=production
```

## Troubleshooting

### WebSocket Connection Errors

If you see WebSocket connection errors in the browser console:

1. Verify `VITE_PUBLIC_ZERO_SERVER` points to the correct Zero cache URL
2. Ensure the Zero cache domain has SSL configured
3. Check that Zero cache service is running and healthy

### Database Connection Issues

1. Check PostgreSQL logs in Coolify
2. Verify `POSTGRES_PASSWORD` is set correctly
3. Ensure PostgreSQL container is healthy before other services start

### Build Failures

1. Check the build logs in Coolify
2. Ensure all required environment variables are set
3. Verify the `bun.lock` file is committed to your repository

## Scaling

For production workloads, consider:

1. **Increase Zero Sync Workers**: Set `ZERO_NUM_SYNC_WORKERS=4` or higher
2. **Use Managed PostgreSQL**: Consider using a managed database like Neon, Supabase, or AWS RDS
3. **Add Redis**: For session storage in multi-instance deployments

## Backup

Configure automatic PostgreSQL backups in Coolify:

1. Go to your PostgreSQL service
2. Navigate to **Backups** tab
3. Configure S3-compatible storage for backups
4. Set backup schedule

## Alternative: Separate Services Deployment

Instead of using Docker Compose, you can deploy each service separately in Coolify:

1. **PostgreSQL**: Use Coolify's one-click PostgreSQL database
2. **Zero Cache**: Deploy as a separate Dockerfile application
3. **Web**: Deploy as a separate Dockerfile application

This approach gives you more granular control over each service.
