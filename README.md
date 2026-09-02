# Nexora

**Multi-Tenant Project Management SaaS**

Nexora is a full-stack project management platform for teams to organize projects, manage tasks, collaborate across workspaces, handle invitations, control access, and manage subscription billing.

The project focuses on **multi-tenancy, security, background processing, automated testing, and production-oriented architecture** rather than a basic CRUD implementation.

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
- Process background jobs with Redis and BullMQ
- Protect tenant data with PostgreSQL Row-Level Security
- Run browser-level tests with Playwright

The application is structured as a **pnpm monorepo** with separate frontend, API, worker, and database responsibilities.

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

### PostgreSQL Row-Level Security

Nexora adds PostgreSQL RLS as a database-level security boundary alongside application authorization. Tenant context is established inside database transactions and RLS policies restrict tenant-owned records.

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
                    │   + RLS  │  │  Queue   │
                    └──────────┘  └────┬─────┘
                                       │
                                       ▼
                                  ┌──────────┐
                                  │  Worker  │
                                  └──────────┘
```

## Tech Stack

### Frontend

- Next.js 14
- React 18
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
├── docker-compose.yml
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
- PostgreSQL
- Redis

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
docker compose up -d
```

### 4. Configure environment variables

Create the required local environment files and configure values such as:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
REDIS_URL=redis://HOST:PORT
JWT_SECRET=your-local-secret
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PRICE_PRO=your-stripe-price-id
```

Never commit real secrets or `.env` files.

### 5. Generate Prisma Client

```bash
pnpm --filter @nexora/db exec prisma generate
```

### 6. Run migrations

```bash
pnpm --filter @nexora/db exec prisma migrate dev
```

### 7. Start the development applications

Use the project's configured pnpm development scripts for the web application, API, and worker.

Typical services:

```text
Frontend → http://localhost:3000
API      → http://localhost:4000
Redis    → Docker
Database → Docker/PostgreSQL
Worker   → Background process
```

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

The data model includes users, tenants, memberships, projects, tasks, and invitations.

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

Run Playwright:

```bash
pnpm exec playwright test
```

Core E2E coverage includes authentication, project creation, and task management.

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

---

## Security Architecture

```text
Request
   │
   ▼
Authentication
   │
   ▼
Authorization / RBAC
   │
   ▼
Tenant Context
   │
   ▼
Prisma Queries
   │
   ▼
PostgreSQL RLS
   │
   ▼
Tenant Data
```

This layered model means tenant isolation is supported at both the application and database levels.

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
- PostgreSQL RLS
- Playwright E2E testing
- GitHub Actions CI
- Docker-based infrastructure

A public hosted URL is not currently provided. Follow the local development instructions to run the application.

---

## License

This project is available for educational and portfolio purposes.

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack developer focused on frontend engineering, backend systems, APIs, automation, databases, and practical software architecture.

**GitHub:** https://github.com/Scarlet-Twinz
