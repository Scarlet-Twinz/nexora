-- Enable PostgreSQL row-level security for tenant-owned data.
-- The application sets app.tenant_id inside the same transaction via withTenant().
-- Bootstrap/authentication tables remain outside RLS because they are accessed
-- before a tenant context exists.

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcessedWebhook" ENABLE ROW LEVEL SECURITY;

CREATE POLICY membership_tenant_isolation ON "Membership"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY project_tenant_isolation ON "Project"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY task_tenant_isolation ON "Task"
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "Task"."projectId"
        AND p."tenantId" = current_setting('app.tenant_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "Task"."projectId"
        AND p."tenantId" = current_setting('app.tenant_id', true)
    )
  );

CREATE POLICY invite_tenant_isolation ON "Invite"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY subscription_tenant_isolation ON "Subscription"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY audit_log_tenant_isolation ON "AuditLog"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY processed_webhook_tenant_isolation ON "ProcessedWebhook"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
