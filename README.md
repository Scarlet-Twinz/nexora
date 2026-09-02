# Nexora saas platform

**Multi-Tenant Project Management SaaS**

Nexora is a full-stack project management platform built for teams to organize projects, manage tasks, collaborate across workspaces, handle team invitations, and manage subscription billing.

The project was built with a focus on **multi-tenancy, security, background processing, automated testing, and production-oriented architecture** rather than a basic CRUD implementation.

**GitHub:** `https://github.com/Scarlet-Twinz/nexora`

---

## Overview

Nexora provides teams with an isolated workspace where they can:

* Create and manage projects
* Create and manage tasks
* Organize work across multiple tenants
* Invite team members
* Control access using roles
* Authenticate securely with JWT
* Manage Pro subscriptions through Stripe
* Process background jobs using Redis and BullMQ
* Protect tenant data with PostgreSQL Row-Level Security
* Run automated end-to-end tests with Playwright

The application is structured as a **pnpm monorepo** with separate frontend, API, worker, and database packages.

---

## Features

### 🔐 Authentication & Authorization

* User registration and login
* JWT-based authentication
* Refresh-token cookie support
* Protected API routes
* Role-based access control
* Workspace-level authorization
* Secure password hashing

### 🏢 Multi-Tenant Architecture

Nexora is designed around workspace isolation.

Each workspace represents a tenant, and users belong to tenants through memberships.

Tenant-aware operations ensure that users only access resources belonging to their workspace.

### 🛡️ PostgreSQL Row-Level Security

Nexora implements PostgreSQL Row-Level Security (RLS) for tenant isolation.

The API establishes the current tenant inside a database transaction using a transaction-local PostgreSQL setting:

```sql
set_config('app.tenant_id', ..., true)
```

RLS policies then restrict access to tenant-owned records.

Protected resources include:

* Tenants
* Memberships
* Projects
* Tasks
* Invitations

This adds a database-level security boundary in addition to application-level authorization.

### 📁 Projects

Users can:

* Create projects
* View projects
* View individual projects
* Update projects
* Delete projects

Projects are automatically associated with the authenticated user's workspace.

### ✅ Tasks

Users can:

* Create tasks
* View project tasks
* Update tasks
* Delete tasks
* Track task status

Tasks inherit tenant ownership through their associated project.

### 👥 Team Invitations

Workspace members with the appropriate permissions can invite users to their workspace.

The invitation system supports:

* Invitation tokens
* Email-based invitations
* Expiration
* Role assignment
* Invitation acceptance
* Existing-member detection
* Signup through invitation links

### 💳 Stripe Billing

Nexora integrates with Stripe for subscription billing.

The billing flow supports:

* Pro subscription checkout
* Stripe Checkout
* Subscription-based plans
* Sandbox/test billing during development

The Stripe integration is designed so that secret credentials remain server-side.

### ⚙️ Background Jobs

Nexora uses **Redis + BullMQ** for asynchronous processing.

Architecture:

```text
API
 │
 ▼
Redis
 │
 ▼
BullMQ Queue
 │
 ▼
Worker
```

This keeps background work separate from normal API request handling.

### 🧪 End-to-End Testing

Playwright is used for browser-level testing.

Current E2E coverage includes:

* Authentication
* Dashboard/project creation
* Task creation

Example:

```text
3 passed
```

### 🔄 Continuous Integration

GitHub Actions automatically builds the application on pushes and pull requests.

The CI pipeline includes:

* Node.js setup
* pnpm installation
* Dependency installation
* Prisma client generation
* API build
* Worker build
* Web build

PostgreSQL and Redis services are provided inside the CI environment.

---

# Architecture

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
                         │ Authentication       │
                         │ RBAC                 │
                         │ Projects / Tasks     │
                         │ Invites / Billing    │
                         └───────┬────────┬─────┘
                                 │        │
                         Prisma  │        │ BullMQ
                                 │        │
                                 ▼        ▼
                       ┌────────────┐  ┌────────────┐
                       │ PostgreSQL │  │   Redis    │
                       │            │  │            │
                       │ RLS        │  │ Job Queue  │
                       └────────────┘  └─────┬──────┘
                                             │
                                             ▼
                                      ┌────────────┐
                                      │   Worker   │
                                      │  BullMQ    │
                                      └────────────┘
```

---

# Application Flow

```text
User
 │
 ▼
Next.js Frontend
 │
 ▼
Fastify API
 │
 ├── Authentication
 │
 ├── Authorization / RBAC
 │
 ├── Tenant Context
 │
 ├── Projects
 │
 ├── Tasks
 │
 ├── Invitations
 │
 └── Billing
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
 │
 └── Row-Level Security
```

For asynchronous operations:

```text
Fastify API
     │
     ▼
   Redis
     │
     ▼
  BullMQ
     │
     ▼
  Worker
```

---

# Tech Stack

## Frontend

* Next.js 14
* React 18
* TypeScript
* Axios
* React Hook Form
* Tailwind CSS

## Backend

* Node.js
* Fastify
* TypeScript
* JWT
* bcrypt
* Axios

## Database

* PostgreSQL
* Prisma ORM
* PostgreSQL Row-Level Security

## Background Processing

* Redis
* BullMQ

## Payments

* Stripe

## Testing

* Playwright

## DevOps / CI

* Docker
* Docker Compose
* GitHub Actions
* pnpm

---

# Authentication

Nexora uses JWT-based authentication.

The authentication flow is:

```text
Signup / Login
      │
      ▼
Fastify Auth API
      │
      ▼
JWT Access Token
      │
      ▼
Authenticated Frontend
      │
      ▼
Protected API Requests
```

Refresh-token functionality uses an HTTP cookie to provide a separate mechanism for maintaining authenticated sessions.

Passwords are hashed before storage and are never stored as plaintext.

---

# Multi-Tenancy

Nexora uses a tenant-based architecture.

The primary relationships are:

```text
Tenant
 ├── Memberships
 ├── Projects
 │    └── Tasks
 └── Invitations
```

Users are connected to workspaces through memberships.

This allows the same application instance to serve multiple independent workspaces while keeping their data isolated.

---

# Database & Prisma

The database schema is managed with Prisma.

Generate the Prisma client:

```bash
pnpm --filter @nexora/db exec prisma generate
```

Create and apply a development migration:

```bash
pnpm --filter @nexora/db exec prisma migrate dev
```

The database contains models for:

* Users
* Tenants
* Memberships
* Projects
* Tasks
* Invitations

PostgreSQL RLS provides an additional database-level tenant isolation layer.

---

# Project Structure

```text
nexora/
│
├── apps/
│   ├── web/
│   │   ├── pages/
│   │   └── src/
│   │
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       ├── middleware/
│   │       └── db.ts
│   │
│   └── worker/
│       └── src/
│
├── packages/
│   └── db/
│       ├── prisma/
│       │   ├── migrations/
│       │   └── schema.prisma
│       └── src/
│
├── tests/
│   └── e2e/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── playwright.config.ts
```

---

# Prerequisites

Before running Nexora locally, install:

* Node.js 20+
* pnpm
* Docker
* Docker Compose
* PostgreSQL
* Redis

The project uses pnpm workspaces.

---

# Local Development

Clone the repository:

```bash
git clone https://github.com/Scarlet-Twinz/nexora.git
cd nexora
```

Install dependencies:

```bash
pnpm install
```

Start infrastructure:

```bash
docker compose up -d
```

Generate Prisma:

```bash
pnpm --filter @nexora/db exec prisma generate
```

Run migrations:

```bash
pnpm --filter @nexora/db exec prisma migrate dev
```

Start the development applications using the project's configured pnpm scripts.

The typical development services are:

```text
Frontend     http://localhost:3000
API          http://localhost:4000
PostgreSQL   Docker
Redis        Docker
Worker       Background process
```

---

# Environment Variables

Create the required environment files locally.

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

REDIS_URL=redis://HOST:PORT

JWT_SECRET=your-local-secret

NEXT_PUBLIC_API_URL=http://localhost:4000

NEXT_PUBLIC_STRIPE_PRICE_PRO=your-stripe-price-id
```

> Never commit real secrets, API keys, database passwords, or Stripe secret keys to Git.

---

# Build

Build the API:

```bash
pnpm --filter @nexora/api build
```

Build the worker:

```bash
pnpm --filter worker build
```

Build the web application:

```bash
pnpm --filter web build
```

---

# Testing

Run the Playwright test suite:

```bash
pnpm exec playwright test
```

The E2E suite covers core application flows including authentication, projects, and tasks.

Example result:

```text
3 passed
```

---

# Continuous Integration

Nexora uses GitHub Actions for continuous integration.

The CI workflow:

1. Starts PostgreSQL
2. Starts Redis
3. Installs dependencies
4. Generates Prisma Client
5. Builds the API
6. Builds the worker
7. Builds the frontend

Workflow:

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


# What I Implemented

This project goes beyond a basic project-management CRUD application.

Key engineering work includes:

* Designed a multi-tenant SaaS architecture
* Implemented JWT authentication
* Implemented role-based authorization
* Built workspace membership handling
* Built project and task management
* Implemented team invitation flows
* Added Stripe subscription billing
* Integrated Redis and BullMQ
* Built a dedicated background worker
* Added PostgreSQL Row-Level Security
* Added transaction-local tenant context
* Added Playwright browser testing
* Added GitHub Actions CI
* Structured the application as a pnpm monorepo
* Added Docker-based infrastructure
* Separated frontend, API, worker, and database responsibilities

---

# Security Architecture

Nexora uses multiple layers of protection:

```text
                  Request
                     │
                     ▼
             Authentication
                     │
                     ▼
               Authorization
                     │
                     ▼
              Tenant Context
                     │
                     ▼
              Prisma Queries
                     │
                     ▼
          PostgreSQL Row-Level
                 Security
                     │
                     ▼
             Tenant Data
```

This layered approach means tenant isolation is not dependent solely on frontend behavior or application-level checks.

---

# Current Status

**Status: Deployed and functional**

Implemented:

* Authentication
* Multi-tenancy
* RBAC
* Projects
* Tasks
* Invitations
* Stripe billing
* Background jobs
* PostgreSQL RLS
* Playwright E2E
* GitHub Actions CI
* Production deployment

The project is actively structured as a full-stack SaaS application demonstrating backend architecture, security, databases, asynchronous processing, testing, and DevOps practices.

---

# Contributing

Contributions and improvements are welcome.

To contribute:

```bash
git checkout -b feature/your-feature
```

Make your changes, test them locally, and open a pull request.

Before submitting a pull request, ensure that:

* The application builds successfully
* Existing tests pass
* New functionality includes appropriate tests
* No secrets are committed

* Deployment: The project is configured for deployment, but a public hosted URL is not currently provided. The application can be run locally by following the Local Development instructions above.

---

# License

This project is available for educational and portfolio purposes.

---

## Author

**Scarlet-Twinz**

GitHub: `https://github.com/Scarlet-Twinz`
