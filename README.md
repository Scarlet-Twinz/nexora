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
- Apply tenant-aware database access through transaction-local tenant context
- Run browser-level tests with Playwright

The codebase is organized as a **pnpm monorepo** with dedicated web, API, worker, and database packages.

## Engineering Focus

Nexora is designed around several problems that appear in real SaaS systems:

- **Multi-tenancy:** tenant identity is carried through application operations rather than relying only on client-side filtering.
- **Authorization:** authentication and workspace-level RBAC are separate concerns from resource access.
- **Background processing:** asynchronous work is separated from HTTP request handling through Redis and BullMQ.
- **Database safety:** tenant context is established inside a database transaction so it is scoped to the transaction rather than leaking across pooled connections.
- **Verification:** critical user flows are exercised with browser-level Playwright tests.
- **Delivery:** GitHub Actions provides repeatable dependency installation, Prisma generation, and application builds.

> **Security note:** the repository contains the transaction-local tenant-context foundation for database isolation. PostgreSQL RLS policies are not documented as active until they are present in the migration history and covered by tests.

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

Each workspace represents a tenant. Users belong to tenants through memberships, and tenant-aware operations restrict access to workspace-owned resources.

### Projects & Tasks

Users can create, view, update, and delete projects and tasks while maintaining workspace ownership.

### Team Invitations

Workspace members with appropriate permissions can invite users using expiring invitation tokens and role assignment.

### Stripe Billing

The billing flow supports Pro subscription checkout through Stripe Checkout. Secret credentials remain server-side.

### Background Jobs

Redis and BullMQ handle asynchronous processing through a dedicated worker:

```text
API → Redis → BullMQ → Worker
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
                    │  Tenant  │  │  Queue   │
                    │  Context │  └────┬─────┘
                    └──────────┘       │
                                       ▼
                                  ┌──────────┐
                                  │  Worker  │
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

### Maintaining tenant context safely

A multi-tenant application must avoid relying on a mutable global tenant value when database connections are pooled. Nexora establishes tenant context inside a Prisma transaction, keeping that context scoped to the transaction that performs the tenant-aware work.

This creates a clear boundary between **request authorization** and **database access**, while avoiding connection-pool context leaking between requests.

### Separating asynchronous work from HTTP requests

Long-running or asynchronous work is routed through Redis and BullMQ instead of keeping the HTTP request responsible for background processing. A dedicated worker consumes queued jobs independently from the API process.

This separation makes the system easier to scale and keeps request handling focused on synchronous application operations.

---

## Security Considerations

Nexora uses multiple application-level controls:

- JWT-based authentication
- HttpOnly refresh-token cookie support
- Workspace-level RBAC
- Tenant-aware resource queries
- Transaction-scoped tenant context
- Server-side Stripe secret handling
- Local-secret and credential files excluded from version control

The repository intentionally avoids claiming PostgreSQL Row-Level Security as an active enforcement layer until corresponding SQL policies and automated isolation tests are present in the migration history.

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
