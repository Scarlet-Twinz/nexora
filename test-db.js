const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: "Acme, Inc.",
        slug: "acme",
      },
    });

    // Membership is protected by RLS, so establish the tenant context
    // before creating the owner membership.
    await tx.$executeRaw`
      SELECT set_config(
        'app.tenant_id',
        ${tenant.id},
        true
      )
    `;

    const user = await tx.user.create({
      data: {
        email: "owner@acme.test",
        password: "password-placeholder",
        name: "Owner Acme",
        memberships: {
          create: {
            tenantId: tenant.id,
            role: "OWNER",
          },
        },
      },
    });

    console.log("Tenant created:", tenant);
    console.log("User created:", {
      id: user.id,
      email: user.email,
    });
  });
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
