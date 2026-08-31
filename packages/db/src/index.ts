import { PrismaClient } from '@prisma/client';

declare global {
  // Avoid multiple instances in dev (hot reload)
  // @ts-ignore
  var __prisma__: PrismaClient | undefined;
}

const prisma = global.__prisma__ || new PrismaClient({ log: ['query'] });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}

export default prisma;