-- Keep the database schema aligned with schema.prisma.
ALTER TABLE "User"
  ADD COLUMN "refreshTokenVersion" INTEGER NOT NULL DEFAULT 0;
