import prisma from '@nexora/db/src';

/**
 * Set tenant id on the DB session so RLS can use current_setting('app.tenant_id').
 * Note: Prisma uses a connection pool. For strict per-connection settings, run this
 * inside the same transaction where you perform queries (or continue using app-level filters).
 */
export async function setTenantSession(tenantId: string) {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
}

export default prisma;