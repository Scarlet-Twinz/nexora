# NEXORA

**Multi-tenant SaaS workplace built around explicit tenant isolation.**

NEXORA is a full-stack project-management platform designed to demonstrate the boundaries that make a multi-tenant SaaS system safe and operable: authentication, authorization, PostgreSQL Row-Level Security, transaction-local tenant context, asynchronous workers, billing, browser testing, and CI validation.

## Why This Project Matters

The interesting part of NEXORA is not the task board. It is the **tenant boundary**.

A request must carry enough authenticated context for the API to establish the current workspace, while PostgreSQL independently enforces which tenant-owned rows may be accessed. That same tenant identity is propagated into background jobs instead of disappearing at the queue boundary.

```text
User
 │
 ▼
Next.js
 │ JWT
 ▼
Fastify API
 │
 ├── auth / RBAC
 ├── tenant context
 └── domain operations
        │
        ├──────────────► Redis / BullMQ ───► Worker
        │                                      │
        │                                  tenantId
        ▼                                      │
     Prisma ───────────────────────────────► PostgreSQL
                                                │
                                           PostgreSQL RLS
```

## Core Features

- Multi-tenant workspaces
- JWT authentication with refresh-token cookies
- Workspace-level RBAC
- Projects and tasks
- Team invitations
- PostgreSQL RLS with `FORCE ROW LEVEL SECURITY`
- Transaction-local tenant context
- Tenant context propagation into workers
- Redis + BullMQ background processing
- Stripe Checkout billing integration
- Next.js web application
- Fastify API
- Prisma/PostgreSQL data layer
- Playwright browser tests
- Docker Compose development infrastructure
- GitHub Actions CI with migration/build validation

## Tenant Isolation Model

NEXORA protects tenant-owned resources at more than one layer.

1. The authenticated request establishes the tenant context.
2. Database operations run inside a transaction with that context available to PostgreSQL.
3. Row-Level Security policies restrict tenant-owned rows.
4. `FORCE ROW LEVEL SECURITY` prevents the table-owning role from silently bypassing those policies.
5. Public invite/auth bootstrap paths use narrowly scoped contexts before a tenant is known.
6. BullMQ jobs carry `tenantId` explicitly and establish a fresh transaction context in the worker.

This makes tenant isolation part of the data-access model rather than only an application convention.

## Architecture

```text
Next.js Web
    │
    │ HTTP / JWT
    ▼
Fastify API
    │
    ├──────────────► Redis / BullMQ ─────────► Worker
    │                                               │
    │                                               │ tenant context
    ▼                                               ▼
Prisma ───────────────────────────────────────► PostgreSQL
                                                  RLS + FORCE RLS
```

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 14, React 19, TypeScript, Tailwind CSS |
| API | Fastify 5, TypeScript, JWT, Zod |
| Database | PostgreSQL, Prisma 6 |
| Multi-tenancy | PostgreSQL RLS, transaction-local context |
| Background jobs | Redis, BullMQ, dedicated worker |
| Billing | Stripe Checkout |
| Testing | Playwright |
| Infrastructure | Docker Compose |
| CI | GitHub Actions |
| Workspace | pnpm monorepo |

## Repository Structure

```text
nexora/
├── apps/
│   ├── api/       # Fastify API
│   ├── web/       # Next.js application
│   └── worker/    # BullMQ worker
├── packages/
│   └── db/        # Prisma schema and migrations
├── tests/
│   └── e2e/       # Playwright coverage
├── .github/workflows/
├── docker-compose.dev.yml
├── package.json
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 11+
- Docker Desktop with Docker Compose

```bash
git clone https://github.com/Scarlet-Twinz/nexora.git
cd nexora
pnpm install
docker compose -f docker-compose.dev.yml up -d
```

Configure the service-specific `.env` files from the committed examples, then apply migrations:

```bash
pnpm --filter @nexora/db exec prisma migrate dev
pnpm --filter @nexora/db exec prisma generate
```

Start the monorepo:

```bash
pnpm dev
```

Default development endpoints:

```text
Web    → http://localhost:3000
API    → http://localhost:4000
Health → http://localhost:4000/health
```

## Testing & CI

Browser tests:

```bash
pnpm exec playwright test
```

Build:

```bash
pnpm build
```

GitHub Actions validates dependency installation, PostgreSQL startup, Prisma migrations/generation, and builds for the API, worker, and web application.

## Engineering Decisions

### Database-enforced isolation

Application authorization is reinforced by PostgreSQL RLS rather than relying on every query author to remember a `tenant_id` filter.

### Async boundary preservation

Workers receive the tenant identity as job data and establish their own database context. Tenant isolation therefore survives asynchronous execution.

### Bootstrap contexts

Authentication and invitation acceptance happen before a normal tenant context exists. These paths use deliberately scoped bootstrap context instead of weakening the normal tenant boundary.

### Migration discipline

Schema state is represented through Prisma migrations and validated in CI, reducing the risk that local development silently depends on an untracked database shape.

## Current Status

**Functional full-stack SaaS project.**

Implemented areas include authentication, multi-tenancy, RBAC, projects/tasks, invitations, Stripe billing, Redis/BullMQ jobs, PostgreSQL RLS, Docker development infrastructure, Playwright E2E coverage, and CI build/migration validation.

The application is currently run locally from the repository.

## Security

Never commit `.env` files, passwords, JWTs, refresh tokens, Stripe secrets, SMTP passwords, or browser session data. Use the committed environment templates for local configuration.

## License

MIT

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack and systems engineer focused on SaaS architecture, backend systems, databases, distributed processing, networking, AI integration, and practical software engineering.

## Project Links

- **Repository:** https://github.com/Scarlet-Twinz/nexora
- **Author:** Anthony Emmanuella Mmasinachi
- **GitHub:** https://github.com/Scarlet-Twinz
