-- PostgreSQL Row-Level Security for tenant-owned data.
-- app.tenant_id is set transaction-locally by the API before tenant-scoped work.
-- app.user_id is set for authentication transactions that must resolve a user's memberships.
-- app.invite_token is set for public invite transactions that must resolve one invite.

CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_current_invite_token()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.invite_token', true), '')
$$;

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_tenant_isolation ON "Membership"
  USING (
    "tenantId" = app_current_tenant_id()
    OR "userId" = app_current_user_id()
  )
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
CREATE POLICY project_tenant_isolation ON "Project"
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" FORCE ROW LEVEL SECURITY;
CREATE POLICY invite_tenant_isolation ON "Invite"
  USING (
    "tenantId" = app_current_tenant_id()
    OR "token" = app_current_invite_token()
  )
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
