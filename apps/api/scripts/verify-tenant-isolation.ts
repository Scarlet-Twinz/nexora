import prisma from '@nexora/db/src';

const tenantId = `tenant-a-${Date.now()}`;
const tenantBId = `tenant-b-${Date.now()}`;
const userAId = `user-a-${Date.now()}`;
const userBId = `user-b-${Date.now()}`;

async function setTenant(tenantId: string) {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
}

async function clearContext() {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', false)`;
  await prisma.$executeRaw`SELECT set_config('app.user_id', '', false)`;
  await prisma.$executeRaw`SELECT set_config('app.invite_token', '', false)`;
}

async function main() {
  try {
    await clearContext();

    const tenantA = await prisma.tenant.create({
      data: { id: tenantId, name: 'Isolation A', slug: `isolation-a-${Date.now()}` },
    });
    const tenantB = await prisma.tenant.create({
      data: { id: tenantBId, name: 'Isolation B', slug: `isolation-b-${Date.now()}` },
    });

    const userA = await prisma.user.create({
      data: { id: userAId, email: `${userAId}@example.test`, password: 'test-password' },
    });
    const userB = await prisma.user.create({
      data: { id: userBId, email: `${userBId}@example.test`, password: 'test-password' },
    });

    await setTenant(tenantA.id);
    const membershipA = await prisma.membership.create({
      data: { tenantId: tenantA.id, userId: userA.id, role: 'OWNER' },
    });
    const projectA = await prisma.project.create({
      data: { tenantId: tenantA.id, name: 'Tenant A Project', createdBy: userA.id },
    });
    const taskA = await prisma.task.create({
      data: { projectId: projectA.id, title: 'Tenant A Task' },
    });
    const inviteA = await prisma.invite.create({
      data: {
        tenantId: tenantA.id,
        token: `invite-${Date.now()}`,
        email: 'member-a@example.test',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.subscription.create({
      data: {
        tenantId: tenantA.id,
        stripeCustomerId: `cus-${Date.now()}`,
        status: 'active',
      },
    });
    await prisma.auditLog.create({
      data: { tenantId: tenantA.id, userId: userA.id, action: 'isolation-test' },
    });

    await setTenant(tenantB.id);
    await prisma.membership.create({
      data: { tenantId: tenantB.id, userId: userB.id, role: 'OWNER' },
    });
    const visibleProjects = await prisma.project.findMany({ where: { id: projectA.id } });
    const visibleTasks = await prisma.task.findMany({ where: { id: taskA.id } });
    const visibleMemberships = await prisma.membership.findMany({ where: { id: membershipA.id } });
    const visibleInvites = await prisma.invite.findMany({ where: { id: inviteA.id } });
    const visibleSubscriptions = await prisma.subscription.findMany({ where: { tenantId: tenantA.id } });
    const visibleAuditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenantA.id } });

    if (visibleProjects.length || visibleTasks.length || visibleMemberships.length || visibleInvites.length || visibleSubscriptions.length || visibleAuditLogs.length) {
      throw new Error('Cross-tenant rows were visible under Tenant B context');
    }

    let wrongTenantInsertBlocked = false;
    try {
      await prisma.project.create({
        data: { tenantId: tenantA.id, name: 'Should Be Blocked', createdBy: userB.id },
      });
    } catch {
      wrongTenantInsertBlocked = true;
    }

    if (!wrongTenantInsertBlocked) {
      throw new Error('RLS allowed a Tenant B context to insert a Tenant A project');
    }

    console.log('Tenant isolation verification passed.');
  } finally {
    await clearContext();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
