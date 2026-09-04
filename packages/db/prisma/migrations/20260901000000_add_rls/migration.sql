-- Enable PostgreSQL row-level security for tenant-owned tables that are
-- present in the migration history. The application sets app.tenant_id
-- inside the same Prisma transaction via withTenant().

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;

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

-- Public invite acceptance discovers the tenant from a one-time invite
-- token before app.tenant_id is known. The token itself is transaction-local
-- and is never persisted as a session/global setting.
CREATE POLICY invite_tenant_isolation ON "Invite"
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    OR "token" = current_setting('app.invite_token', true)
  )
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
