# Nexora

**Multi-Tenant Project Management SaaS**

Nexora is a full-stack project management platform built around a multi-tenant SaaS architecture. Teams can organize projects and tasks, manage workspace membership, invite users, control access with roles, and manage Pro subscriptions.

The project is intentionally focused on **tenant isolation, authorization, background processing, automated browser testing, and production-oriented engineering practices** rather than a basic CRUD application.

**GitHub:** https://github.com/Scarlet-Twinz/nexora

---

## Overview

Nexora provides isolated workspaces where users can:

- Create and manage projects
- Create and manage tasks
- Invite team members
- Control access using roles
- Authenticate with JWT
- Manage Pro subscriptions through Stripe
- Process asynchronous work with Redis and BullMQ
- Enforce tenant-aware database access with PostgreSQL Row-Level Security
- Run browser-level tests with Playwright

The codebase is organized as a **pnpm monorepo** with dedicated web, API, worker, and database packages.

## Engineering Focus

Nexora is designed around several problems that appear in real SaaS systems:

- **Multi-tenancy:** tenant identity is carried through application operations and enforced again at the database layer for tenant-owned tables.
- **Authorization:** authentication and workspace-level RBAC are separate concerns from resource access.
- **Background processing:** asynchronous work is separated from HTTP request handling through Redis and BullMQ, with tenant context propagated into tenant-scoped jobs.
- **Database safety:** tenant context is established inside a transaction and PostgreSQL RLS policies use that transaction-local context to prevent cross-tenant access.
- **Verification:** critical user flows are exercised with browser-level Playwright tests.
- **Delivery:** GitHub Actions applies Prisma migrations, generates the client, and builds the API, worker, and web application.

> **Security note:** PostgreSQL RLS is implemented for the tenant-owned tables represented in the migration history. RLS is forced for those tables so the database role owning the tables does not bypass the policies. Public invite acceptance uses a transaction-local invite-token context before the tenant is known, and authentication bootstrap can load only the identified user's memberships.

## Features

### Authentication & Authorization

- User registration and login
- JWT authentication
- Refresh-token cookie support
- Protected API routes
- Role-based access control
- Workspace-level authorization
- Secure password hashing

### Multi-Tenancy

Each workspace represents a tenant. Users belong to tenants through memberships, and tenant-aware operations restrict access to workspace-owned resources at both the application and PostgreSQL RLS layers.

### Projects & Tasks

Users can create, view, update, and delete projects and tasks while maintaining workspace ownership.

### Team Invitations

Workspace members with appropriate permissions can invite users using expiring invitation tokens and role assignment. Invitation jobs carry tenant context into the worker so RLS remains effective across the asynchronous boundary.

### Stripe Billing

The billing flow supports Pro subscription checkout through Stripe Checkout. Secret credentials remain server-side.

### Background Jobs

Redis and BullMQ handle asynchronous processing through a dedicated worker:

```text
API → Redis → BullMQ → Worker
                 │
                 └── tenantId → transaction-local RLS context
```

### End-to-End Testing

Playwright provides browser-level coverage for core application flows including authentication, projects, and tasks.

### Continuous Integration

GitHub Actions validates the application by applying Prisma migrations, generating Prisma Client, and building the API, worker, and web application.

---

## Architecture

```text
                    ┌──────────────────────┐
                    │      Next.js Web      │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                               │ HTTP / JWT
                               ▼
                    ┌──────────────────────┐
                    │     Fastify API      │
                    │ Auth / RBAC / SaaS   │
                    └───────┬────────┬─────┘
                            │        │
                       Prisma       │ BullMQ
                            │        │
                            ▼        ▼
                    ┌──────────┐  ┌──────────┐
                    │PostgreSQL│  │  Redis   │
                    │ RLS +    │  │  Queue   │
                    │ Tenant   │  └────┬─────┘
                    └──────────┘       │
                                       ▼
                                  ┌──────────┐
                                  │  Worker  │
                                  │Tenant RLS│
                                  └──────────┘
```

## Tech Stack

### Frontend

- Next.js 14
- React 19
- TypeScript
- Axios
- React Hook Form
- Tailwind CSS

### Backend

- Node.js
- Fastify
- TypeScript
- JWT
- bcrypt

### Data & Infrastructure

- PostgreSQL
- Prisma ORM
- PostgreSQL Row-Level Security
- Transaction-local tenant context
- Redis
- BullMQ
- Docker / Docker Compose

### Payments & Testing

- Stripe
- Playwright
- GitHub Actions
- pnpm

---

## Project Structure

```text
nexora/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   └── db/
│       └── prisma/
├── tests/
│   └── e2e/
├── .github/
│   └── workflows/
├── docker-compose.dev.yml
├── package.json
├── pnpm-workspace.yaml
└── playwright.config.ts
```

---

## Prerequisites

Install:

- Node.js 20+
- pnpm
- Docker
- Docker Compose

PostgreSQL and Redis are provided by the development Docker Compose stack, so separate local installations are not required for the standard setup.

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Scarlet-Twinz/nexora.git
cd nexora
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Verify infrastructure

```bash
docker compose -f docker-compose.dev.yml ps
```

You should see the PostgreSQL and Redis services running.

### 5. Configure environment variables

Create the required local environment files and configure values such as:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
REDIS_URL=redis://HOST:PORT
JWT_SECRET=your-local-secret
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PRICE_PRO=your-stripe-price-id
```

Never commit real secrets, credentials, cookies, or local test environment files.

### 6. Apply migrations and generate Prisma Client

```bash
pnpm --filter @nexora/db exec prisma migrate dev
pnpm --filter @nexora/db exec prisma generate
```

### 7. Start the development applications

Use the configured pnpm development scripts for the web application, API, and worker.

Typical services:

```text
Frontend → http://localhost:3000
API      → http://localhost:4000
Redis    → Docker
Database → Docker/PostgreSQL
Worker   → Background process
```

---

## Local Verification Checklist

After setup, verify the system in this order:

```bash
# Infrastructure health
docker compose -f docker-compose.dev.yml ps

# Database migrations
pnpm --filter @nexora/db exec prisma migrate dev

# Prisma client
pnpm --filter @nexora/db exec prisma generate

# Browser-level verification
pnpm exec playwright test
```

For the Playwright suite, provide the test credentials expected by the E2E specs through `.env.test.local`. Keep that file local and untracked.

---

## Database

Generate Prisma Client:

```bash
pnpm --filter @nexora/db exec prisma generate
```

Create and apply a development migration:

```bash
pnpm --filter @nexora/db exec prisma migrate dev
```

The migration history now covers the Prisma models for tenants, users, memberships, projects, tasks, invitations, subscriptions, audit logs, and processed webhooks. Tenant-owned tables are protected by PostgreSQL RLS where tenant identity exists in the schema.

---

## Build

API:

```bash
pnpm --filter @nexora/api build
```

Worker:

```bash
pnpm --filter worker build
```

Web:

```bash
pnpm --filter web build
```

---

## Testing

Run the Playwright suite:

```bash
pnpm exec playwright test
```

Current E2E coverage includes:

- Authentication
- Project creation
- Task creation and visibility

The Playwright configuration is intentionally environment-independent and uses Playwright's managed browser installation rather than a machine-specific executable path.

---

## CI

GitHub Actions validates the project on pushes and pull requests.

```text
Git Push / Pull Request
          │
          ▼
     GitHub Actions
          │
          ├── PostgreSQL
          ├── Redis
          ├── pnpm install
          ├── Prisma migrate deploy
          ├── Prisma generate
          ├── API build
          ├── Worker build
          └── Web build
```

The CI pipeline validates the migration history as well as application builds, so broken database migrations fail CI instead of being discovered later during deployment.

---

## Engineering Challenges & Problem Solving

### Enforcing tenant boundaries at the database layer

A multi-tenant application must avoid relying only on client-side or ORM-level filtering. Nexora establishes tenant context inside a Prisma transaction and PostgreSQL RLS policies enforce that context for tenant-owned tables.

The RLS migration also uses `FORCE ROW LEVEL SECURITY`, preventing the table-owning database role from silently bypassing the policies.

### Maintaining isolation across authentication and invitations

Authentication needs to discover a user's memberships before a tenant context is available, while public invite acceptance needs to discover a tenant from an invite token. Nexora handles these bootstrap paths with narrowly scoped transaction-local contexts (`app.user_id` and `app.invite_token`) before switching to `app.tenant_id`.

### Maintaining isolation across asynchronous work

Tenant context cannot be assumed to survive an HTTP request. Invite jobs therefore carry `tenantId` explicitly, and the worker establishes a fresh transaction-local tenant context before reading tenant-owned data.

### Separating asynchronous work from HTTP requests

Long-running or asynchronous work is routed through Redis and BullMQ instead of keeping the HTTP request responsible for background processing. A dedicated worker consumes queued jobs independently from the API process.

---

## Security Considerations

Nexora uses multiple application and database controls:

- JWT-based authentication
- HttpOnly refresh-token cookie support
- Workspace-level RBAC
- Tenant-aware resource queries
- PostgreSQL Row-Level Security
- `FORCE ROW LEVEL SECURITY` on protected tables
- Transaction-scoped tenant context
- Tenant context propagation into background jobs
- Server-side Stripe secret handling
- Local-secret and credential files excluded from version control

The RLS migration is deliberately limited to tables that exist in the committed migration history, while schema/migration synchronization migrations keep the Prisma model and database structure aligned.

---

## Current Status

**Status: Functional full-stack SaaS project**

Implemented areas include:

- Authentication
- Multi-tenancy
- RBAC
- Projects and tasks
- Team invitations
- Stripe billing
- Redis and BullMQ background jobs
- Transaction-local tenant context
- PostgreSQL RLS for tenant-owned data
- Playwright E2E testing
- GitHub Actions CI with migration validation
- Docker-based development infrastructure

A public hosted URL is not currently provided. Follow the local development instructions to run the application.

---

## License

This project is available for educational and portfolio purposes.

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack developer focused on frontend engineering, backend systems, APIs, automation, databases, and practical software architecture.

**GitHub:** https://github.com/Scarlet-Twinz
