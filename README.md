# Reflect

A modern product feedback and roadmap platform with real-time collaboration.

Built with [Rocicorp Zero](https://zero.rocicorp.dev) for instant synchronization—changes appear across all devices in milliseconds with full offline support.

## Features

### 📊 Feedback Management
Collect and organize user feedback with voting, comments, and tags. Prioritize what matters most to your users.

### 🗺️ Roadmap Planning
Visualize your product roadmap with a kanban-style board. Drag-and-drop items between stages: Backlog → Planned → In Progress → Done.

### 📝 Changelog & Releases
Keep users informed with beautiful release notes. Link updates directly to the features they requested.

### ⚡ Real-Time Collaboration
Multiple users can work simultaneously without conflicts. Every change syncs instantly across all connected devices.

### 🔒 Team Management
Multi-tenant with organizations, team invitations, and role-based access control.

### 💰 Flexible Pricing
Built-in subscription management with Polar. Free, Pro, and Team tiers with customizable limits.

## Quick Start

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env

# Start development
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Documentation

| Document | Description |
|----------|-------------|
| [Development Guide](docs/DEVELOPMENT.md) | Local setup, commands, troubleshooting |
| [Deployment Guide](docs/DEPLOYMENT.md) | Production deployment with Docker/Dokploy |
| [Architecture](docs/ARCHITECTURE.md) | Technical overview, Zero sync, project structure |

## Tech Stack

- **Frontend**: React 19, Vite, TanStack Router, Tailwind CSS v4
- **Backend**: Hono, Better Auth, Drizzle ORM
- **Sync**: Rocicorp Zero (real-time + offline)
- **Database**: PostgreSQL with logical replication
- **Billing**: Polar
- **Email**: Resend

## License

[MIT](LICENSE)