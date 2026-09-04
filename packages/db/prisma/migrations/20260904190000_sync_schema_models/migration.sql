-- Bring the migration history in sync with schema.prisma.
-- These models exist in the Prisma schema but were missing from the
-- committed migration history.

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT,
  "priceId" TEXT,
  "status" TEXT NOT NULL,
  "currentPeriodStart" INTEGER,
  "currentPeriodEnd" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_tenantId_key"
  ON "Subscription"("tenantId");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_tenantId_idx"
  ON "AuditLog"("tenantId");

CREATE TABLE "ProcessedWebhook" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedWebhook_eventId_key"
  ON "ProcessedWebhook"("eventId");

-- These newly-created tenant-owned tables use the same database-level
-- isolation mechanism as the earlier tenant tables.
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;

CREATE POLICY subscription_tenant_isolation ON "Subscription"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON "AuditLog"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
