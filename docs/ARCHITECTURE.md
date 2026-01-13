# Architecture

Technical architecture and design decisions for Reflect OS.

## System Overview

Reflect OS is a real-time collaborative platform built on [Rocicorp Zero](https://zero.rocicorp.dev) for instant synchronization.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              React Application (Vite)                    │    │
│  │  • TanStack Router for routing                          │    │
│  │  • Zero client for real-time sync                       │    │
│  │  • IndexedDB for offline storage                        │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│                         │ WebSocket                              │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Zero Cache Server                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              SQLite Replica (in-memory)                  │    │
│  │  • Syncs from PostgreSQL via logical replication        │    │
│  │  • Serves client queries with IVM (Incremental View     │    │
│  │    Materialization)                                     │    │
│  │  • Forwards mutations to backend                        │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│                         │ HTTP (queries/mutations)               │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Hono)                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • /api/auth/* - Better Auth (sessions, OAuth)          │    │
│  │  • /api/zero/query - Named query resolution             │    │
│  │  • /api/zero/mutate - Mutation execution                │    │
│  │  • /api/polar/* - Billing webhooks                      │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│                         │ SQL (Drizzle ORM)                      │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • WAL-level logical replication (for Zero)             │    │
│  │  • Source of truth for all data                         │    │
│  │  • Zero metadata in separate schemas                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## How Zero Sync Works

### Data Flow

1. **Client Query**: Browser calls `useQuery(queries.feedback.list(...))`
2. **Zero Client**: Sends query name + args to zero-cache via WebSocket
3. **Zero Cache**: Calls `ZERO_QUERY_URL` (backend) to get ZQL
4. **Backend**: Resolves named query to ZQL, applies permissions
5. **Zero Cache**: Executes ZQL against SQLite replica
6. **Zero Cache**: Streams initial results + live updates via WebSocket
7. **Client**: Receives data, renders UI

### Mutations

1. **Client Mutation**: Browser calls `zero.mutate(mutators.feedback.create(...))`
2. **Optimistic Update**: Zero client applies mutation locally (instant UI)
3. **Zero Cache**: Forwards mutation to `ZERO_MUTATE_URL` (backend)
4. **Backend**: Executes mutation against PostgreSQL
5. **PostgreSQL**: WAL replication notifies zero-cache
6. **Zero Cache**: Updates SQLite replica
7. **All Clients**: Receive update via WebSocket

### Conflict Resolution

Zero uses "last-write-wins" with server authority:
- Optimistic updates are immediately visible
- If server rejects, client state is rolled back
- Concurrent edits are resolved by server timestamp

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework with React Compiler |
| **Vite** | Build tool and dev server |
| **TanStack Router** | Type-safe file-based routing |
| **Rocicorp Zero** | Real-time sync client |
| **Tiptap** | Rich text editor (block-based) |
| **Jotai** | Atomic state management |
| **Tailwind CSS v4** | Utility-first styling |
| **Radix UI** | Accessible component primitives |

### Backend

| Technology | Purpose |
|------------|---------|
| **Hono** | Fast web framework |
| **Better Auth** | Authentication & sessions |
| **Drizzle ORM** | Type-safe database access |
| **Zod** | Schema validation |
| **Resend** | Transactional email |
| **Polar SDK** | Subscription billing |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database |
| **Zero Cache** | Real-time sync server |
| **Docker Compose** | Container orchestration |
| **Turborepo** | Monorepo build system |
| **Bun** | JavaScript runtime & package manager |

## Monorepo Structure

```
reflect-os-zero/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── features/       # Feature modules
│   │   │   │   ├── board/      # Board management
│   │   │   │   ├── changelog/  # Release notes
│   │   │   │   ├── editor/     # Rich text editor
│   │   │   │   ├── feedback/   # Feedback & voting
│   │   │   │   ├── roadmap/    # Kanban roadmap
│   │   │   │   └── subscription/ # Billing UI
│   │   │   ├── components/     # Shared components
│   │   │   ├── schema.ts       # Zero schema + permissions
│   │   │   ├── queries.ts      # Named queries
│   │   │   └── mutators.ts     # Named mutators
│   │   └── vite.config.ts
│   │
│   └── backend/                # Hono API
│       └── src/
│           ├── routes/         # API routes
│           ├── auth.ts         # Better Auth config
│           └── server.ts       # Entry point
│
├── packages/
│   ├── db/                     # Drizzle schema
│   │   ├── src/schema/         # Table definitions
│   │   └── migrations/         # SQL migrations
│   ├── auth/                   # Shared auth utils
│   ├── email/                  # React Email templates
│   ├── polar/                  # Billing config & tiers
│   ├── ui/                     # Shared UI components
│   └── errors/                 # Shared error types
│
├── docs/                       # Documentation
├── docker-compose.yaml         # Docker config (profiles)
└── turbo.json                  # Turborepo config
```

## Feature Architecture

Each feature in `apps/web/src/features/` follows:

```
feature/
├── components/     # UI components
├── hooks/          # React hooks
├── store/          # Jotai atoms (if needed)
└── types.ts        # TypeScript types
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Feedback** | User feedback submission, voting, comments |
| **Roadmap** | Kanban board for feature planning |
| **Changelog** | Release notes and version tracking |
| **Board** | Multi-board organization |
| **Editor** | Block-based rich text (Tiptap) |
| **Subscription** | Plan management and billing |

## Zero Schema & Permissions

The Zero schema in `apps/web/src/schema.ts` defines:

1. **Tables**: Subset of Drizzle schema exposed to Zero
2. **Relationships**: How tables relate (one-to-many, etc.)
3. **Permissions**: Row-level access control

Example permission:

```typescript
permissions: {
  feedback: {
    row: {
      select: [canViewBoard],    // Who can read
      insert: [isAuthenticated], // Who can create
      update: [isOwnerOrAdmin],  // Who can edit
      delete: [isOwnerOrAdmin],  // Who can delete
    },
  },
}
```

## Authentication Flow

1. User submits login form
2. Backend validates with Better Auth
3. Session cookie is set (HTTP-only, secure)
4. Zero-cache forwards cookies to backend (via `ZERO_QUERY_FORWARD_COOKIES`)
5. Backend extracts user from cookie for permissions
6. Zero permissions filter data per-user

## Database Schema Highlights

### Core Entities

- **User**: Account, sessions, OAuth
- **Organization**: Multi-tenant container
- **Board**: Feedback/roadmap container
- **Feedback**: User-submitted items
- **RoadmapItem**: Planned features
- **Changelog**: Release notes

### Zero-Specific

Zero creates its own schemas in PostgreSQL:
- `zero_0/`: Client view records (CVR)
- `zero_0/cdc`: Change data capture

## Performance Considerations

### Zero Optimizations

- **IVM (Incremental View Materialization)**: Only sends deltas
- **Query Caching**: Hydrated queries stay warm
- **Offline Support**: IndexedDB stores data locally

### Best Practices

1. **Narrow queries**: Select only needed columns
2. **Use pagination**: Limit large result sets
3. **Preload queries**: Fetch data before navigation
4. **Avoid N+1**: Use `.related()` for joins
