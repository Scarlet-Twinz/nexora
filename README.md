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
- Enforce tenant isolation at both the application and PostgreSQL RLS layers
- Run browser-level tests with Playwright

The codebase is organized as a **pnpm monorepo** with dedicated web, API, worker, and database packages.

## Engineering Focus

Nexora is designed around several problems that appear in real SaaS systems:

- **Multi-tenancy:** tenant identity is carried through application operations and is independently enforced by PostgreSQL RLS policies.
- **Authorization:** authentication and workspace-level RBAC are separate concerns from resource access.
- **Background processing:** asynchronous work is separated from HTTP request handling through Redis and BullMQ.
- **Database safety:** tenant context is established inside a database transaction so it is scoped to the transaction rather than leaking across pooled connections.
- **Defense in depth:** application-level tenant predicates are backed by database policies for tenant-owned tables.
- **Verification:** critical user flows are exercised with browser-level Playwright tests.
- **Delivery:** GitHub Actions provides repeatable dependency installation, Prisma generation, and application builds.

> **Security note:** PostgreSQL RLS is now defined in the `add_rls` migration for tenant-owned resources. Authentication and public invite flows establish the transaction-local context required by those policies, and queue jobs carry their tenant ID into the worker.

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

Each workspace represents a tenant. Users belong to tenants through memberships, and tenant-aware operations restrict access to workspace-owned resources. PostgreSQL RLS provides a database-level backstop against accidental cross-tenant access.

### Projects & Tasks

Users can create, view, update, and delete projects and tasks while maintaining workspace ownership.

### Team Invitations

Workspace members with appropriate permissions can invite users using expiring invitation tokens and role assignment. Invite jobs carry the tenant context required by the worker's RLS-protected database access.

### Stripe Billing

The billing flow supports Pro subscription checkout through Stripe Checkout. Secret credentials remain server-side, and tenant lookup is executed within the tenant database context.

### Background Jobs

Redis and BullMQ handle asynchronous processing through a dedicated worker:

```text
API → Redis → BullMQ → Worker
                    │
                    └→ transaction-local tenant context
```

### End-to-End Testing

Playwright provides browser-level coverage for core application flows including authentication, projects, and tasks.

### Continuous Integration

GitHub Actions validates the application by installing dependencies, generating Prisma Client, and building the API, worker, and web application.

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
                    │Tenant RLS│  │  Queue   │
                    └──────────┘  └────┬─────┘
                                       │ tenantId
                                       ▼
                                  ┌──────────┐
                                  │  Worker  │
                                  │ Tenant RLS│
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
- PostgreSQL Row-Level Security (RLS)
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

### 6. Generate Prisma Client

```bash
pnpm --filter @nexora/db exec prisma generate
```

### 7. Run migrations

```bash
pnpm --filter @nexora/db exec prisma migrate dev
```

This applies the tenant-isolation migration, including PostgreSQL RLS policies.

### 8. Start the development applications

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

# Prisma client
pnpm --filter @nexora/db exec prisma generate

# Database migrations
pnpm --filter @nexora/db exec prisma migrate dev

# Browser-level verification
pnpm exec playwright test
```

For the Playwright suite, provide the test credentials expected by the E2E specs through `.env.test.local`. Keep that file local and untracked.

For a database-level isolation check, connect to PostgreSQL using the application database role and verify that tenant-owned tables have RLS enabled and forced, then exercise tenant A/B reads and writes through the API. The policies are designed so a missing or incorrect tenant predicate cannot silently expose another tenant's rows.

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

The data model includes tenants, users, memberships, projects, tasks, invitations, subscriptions, audit logs, and processed webhooks.

Tenant-owned resources use PostgreSQL RLS with transaction-local context:

```text
app.tenant_id  → tenant-owned row policies
app.user_id    → authentication membership lookup
app.invite_token → public invite lookup
```

Tasks inherit tenant ownership through their parent project, so their RLS policy verifies the project's tenant before allowing access.

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
          ├── Prisma generate
          ├── API build
          ├── Worker build
          └── Web build
```

The CI pipeline currently focuses on reproducible installation, Prisma generation, and application builds. Browser E2E execution remains a separate verification step.

---

## Engineering Challenges & Problem Solving

### Defense-in-depth tenant isolation

A multi-tenant application should not depend on every future developer remembering to add the correct tenant predicate to every query. Nexora therefore combines application-level tenant checks with PostgreSQL Row-Level Security.

The API establishes `app.tenant_id` inside a transaction. PostgreSQL policies then enforce that tenant-owned rows match the active context. `FORCE ROW LEVEL SECURITY` keeps the policies effective even for the table-owning database role.

Authentication and public invite flows use narrowly scoped transaction-local `app.user_id` and `app.invite_token` contexts where tenant identity is not known yet. This allows those bootstrap operations to remain compatible with RLS without introducing a global connection-level tenant value.

### Maintaining tenant context safely

A multi-tenant application must avoid relying on a mutable global tenant value when database connections are pooled. Nexora establishes tenant context inside a Prisma transaction, keeping that context scoped to the transaction that performs the tenant-aware work.

### Protecting background jobs

Queue consumers do not inherit HTTP request context. Nexora therefore places the `tenantId` directly in tenant-sensitive job payloads and establishes the same transaction-local database context inside the worker before reading tenant-owned data.

### Separating asynchronous work from HTTP requests

Long-running or asynchronous work is routed through Redis and BullMQ instead of keeping the HTTP request responsible for background processing. A dedicated worker consumes queued jobs independently from the API process.

---

## Security Considerations

Nexora uses multiple application- and database-level controls:

- JWT-based authentication
- HttpOnly refresh-token cookie support
- Workspace-level RBAC
- Tenant-aware resource queries
- PostgreSQL Row-Level Security
- `FORCE ROW LEVEL SECURITY` on tenant-owned tables
- Transaction-scoped tenant context
- Explicit tenant context in queue jobs
- Server-side Stripe secret handling
- Local-secret and credential files excluded from version control

The RLS migration covers `Membership`, `Project`, `Task`, `Invite`, `Subscription`, and `AuditLog`. The `Tenant`, `User`, and `ProcessedWebhook` tables are not tenant-scoped rows themselves and therefore are intentionally not covered by tenant RLS policies.

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
- PostgreSQL RLS defense-in-depth
- Playwright E2E testing
- GitHub Actions CI
- Docker-based development infrastructure

A public hosted URL is not currently provided. Follow the local development instructions to run the application.

---

## License

This project is available for educational and portfolio purposes.

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack developer focused on frontend engineering, backend systems, APIs, automation, databases, and practical software architecture.

**GitHub:** https://github.com/Scarlet-Twinz
