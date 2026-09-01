import prisma from '@nexora/db/src';

/**
 * Execute database work with a transaction-local tenant context.
 *
 * The tenant ID exists only for the duration of this transaction,
 * which prevents tenant context from leaking through Prisma's
 * connection pool.
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config(
        'app.tenant_id',
        ${tenantId},
        true
      )
    `;

    return callback(tx as typeof prisma);
  });
}

export default prisma;