# Nexora

**Multi-Tenant SaaS Workplace**

Nexora is a full-stack project-management platform built around multi-tenant SaaS architecture. It combines workspace isolation, JWT authentication, RBAC, PostgreSQL Row-Level Security, Redis/BullMQ background jobs, Stripe billing, Playwright E2E tests, and GitHub Actions CI in a pnpm monorepo.

> **Local-first portfolio project:** Nexora does not currently have a public hosted URL. The repository is documented so another developer can clone it, configure the local environment, start the infrastructure, and run the web/API/worker stack locally.

## Product Preview

A conceptual view of Nexora as a multi-tenant SaaS workspace: a clean project-management interface where teams can move between workspaces, manage projects and tasks, collaborate with members, and access organization-level controls. The presentation emphasizes **workspace isolation, permissions, project execution, and subscription-aware SaaS operations**.

## Features

- Multi-tenant workspaces
- JWT authentication with refresh-token cookies
- Workspace-level RBAC
- Projects and tasks
- Team invitations
- PostgreSQL RLS with `FORCE ROW LEVEL SECURITY`
- Transaction-local tenant context
- Redis + BullMQ background jobs
- Tenant context propagation into workers
- Stripe Checkout billing integration
- Next.js web application
- Fastify API
- Prisma/PostgreSQL data layer
- Playwright browser tests
- GitHub Actions CI with migration validation
- Docker Compose development infrastructure

## Architecture

```text
Next.js Web
    │ HTTP / JWT
    ▼
Fastify API ───────► Redis / BullMQ ───────► Worker
    │                                      │
    ▼                                      │ tenant context
Prisma ───────────► PostgreSQL ◄───────────┘
                     RLS
```

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 14, React 19, TypeScript, Tailwind CSS |
| API | Fastify 5, TypeScript, JWT, Zod |
| Database | PostgreSQL, Prisma 6 |
| Multi-tenancy | PostgreSQL RLS, transaction-local context |
| Background jobs | Redis, BullMQ, dedicated worker |
| Billing | Stripe |
| Testing | Playwright |
| Infrastructure | Docker Compose |
| CI | GitHub Actions |
| Package manager | pnpm |

## Repository Structure

```text
nexora/
├── apps/
│   ├── api/       # Fastify API
│   ├── web/       # Next.js frontend
│   └── worker/    # BullMQ worker
├── packages/
│   └── db/        # Prisma schema and migrations
├── tests/
│   └── e2e/       # Playwright tests
├── .github/
│   └── workflows/
├── docker-compose.dev.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── playwright.config.ts
```

## Quick Start

### Prerequisites

Install:

- Node.js 20+
- pnpm 11+
- Docker Desktop with Docker Compose

Verify:

```bash
node --version
pnpm --version
docker --version
```

### 1. Clone

```bash
git clone https://github.com/Scarlet-Twinz/nexora.git
cd nexora
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start PostgreSQL and Redis

```bash
docker compose -f docker-compose.dev.yml up -d
```

The development stack exposes:

```text
PostgreSQL → localhost:5433
Redis      → localhost:6379
```

### 4. Configure environment files

The monorepo runs each application from its own package directory, so the environment examples are provided next to the services that consume them.

**Database:**

```bash
# macOS/Linux
cp packages/db/.env.example packages/db/.env
```

**API:**

```bash
# macOS/Linux
cp apps/api/.env.example apps/api/.env
```

**Worker:**

```bash
# macOS/Linux
cp apps/worker/.env.example apps/worker/.env
```

**Web:**

```bash
# macOS/Linux
cp apps/web/.env.example apps/web/.env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item packages/db/.env.example packages/db/.env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/worker/.env.example apps/worker/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

The committed examples contain local development values and placeholders only. Do not add real credentials or secrets to Git.

### 5. Apply database migrations

```bash
pnpm --filter @nexora/db exec prisma migrate dev
pnpm --filter @nexora/db exec prisma generate
```

### 6. Start the application

From the repository root:

```bash
pnpm dev
```

This starts the workspace development processes through Turborepo.

Open:

```text
Frontend → http://localhost:3000
API      → http://localhost:4000
Health   → http://localhost:4000/health
```

If you prefer separate terminals:

```bash
pnpm --filter @nexora/api dev
pnpm --filter @nexora/worker dev
pnpm --filter web dev
```

## Environment Variables

### Database

`packages/db/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/nexora_dev
```

### API

`apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/nexora_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-to-a-long-local-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FRONTEND_URL=http://localhost:3000
```

Stripe variables are only needed for billing/webhook flows. Use Stripe test-mode credentials.

### Worker

`apps/worker/.env` contains the database/Redis settings plus optional SMTP configuration. SMTP is not required for local invitation testing; without SMTP credentials the worker logs the generated invitation link.

### Web

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Database & Tenant Isolation

Tenant-owned resources are protected at both the application and database layers. The API establishes transaction-local tenant context before tenant-sensitive operations, while PostgreSQL RLS policies enforce the tenant boundary.

Authentication and public invite acceptance use narrowly scoped bootstrap contexts (`app.user_id` and `app.invite_token`) before switching to `app.tenant_id`. Background jobs explicitly carry `tenantId` and establish a fresh transaction-local context in the worker.

`FORCE ROW LEVEL SECURITY` is enabled on protected tenant-owned tables so the table-owning database role does not bypass the policies.

## Testing

Run the Playwright suite:

```bash
pnpm exec playwright test
```

Core browser coverage includes authentication, project creation, and task creation/visibility.

## Build

```bash
pnpm --filter @nexora/api build
pnpm --filter @nexora/worker build
pnpm --filter web build
```

Or build the complete monorepo:

```bash
pnpm build
```

## CI

GitHub Actions validates the repository by installing dependencies, applying Prisma migrations, generating Prisma Client, and building the API, worker, and web application.

```text
Push / Pull Request
       │
       ▼
GitHub Actions
       ├── Install
       ├── PostgreSQL
       ├── Prisma migrate deploy
       ├── Prisma generate
       ├── API build
       ├── Worker build
       └── Web build
```

## Engineering Focus

Nexora is intentionally more than a basic CRUD application. The main engineering problems are:

- enforcing tenant boundaries beyond ORM query conventions;
- keeping authorization separate from authentication;
- carrying tenant context across asynchronous queue boundaries;
- handling authentication/invitation bootstrap before a tenant is known;
- keeping schema and migration history synchronized;
- validating the repository through automated builds and browser tests.

## Current Status

**Functional full-stack SaaS project.**

Implemented areas include authentication, multi-tenancy, RBAC, projects/tasks, invitations, Stripe billing, Redis/BullMQ jobs, PostgreSQL RLS, Docker development infrastructure, Playwright E2E coverage, and CI build/migration validation.

There is currently no public hosted URL. The intended way to evaluate the application is to clone the repository and follow the Quick Start instructions above.

## Security

Never commit:

- `.env` files
- passwords
- JWTs or refresh tokens
- Stripe secrets
- SMTP passwords
- cookies or browser session files

Use the committed `.env.example` files as templates for local configuration.

## License

This project is available for educational and portfolio purposes.

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack developer focused on frontend engineering, backend systems, APIs, realtime applications, automation, databases, and practical software architecture.

**GitHub:** https://github.com/Scarlet-Twinz
