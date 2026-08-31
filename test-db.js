const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme, Inc.",
      slug: "acme",
    },
  });

  const user = await prisma.user.create({
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

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});