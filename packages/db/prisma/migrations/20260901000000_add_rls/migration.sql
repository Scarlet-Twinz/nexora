-- PostgreSQL Row-Level Security for tenant-owned data.
-- The API establishes app.tenant_id inside the same transaction via withTenant().
-- FORCE RLS ensures table owners do not silently bypass policies.

CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$;

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_tenant_isolation ON "Membership"
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
CREATE POLICY project_tenant_isolation ON "Project"
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" FORCE ROW LEVEL SECURITY;
CREATE POLICY invite_tenant_isolation ON "Invite"
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY subscription_tenant_isolation ON "Subscription"
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant_isolation ON "AuditLog"
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- Tasks inherit tenant ownership through Project.
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
CREATE POLICY task_tenant_isolation ON "Task"
  USING (
    EXISTS (
      SELECT 1
      FROM "Project" p
      WHERE p.id = "Task"."projectId"
        AND p."tenantId" = app_current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Project" p
      WHERE p.id = "Task"."projectId"
        AND p."tenantId" = app_current_tenant_id()
    )
  );
