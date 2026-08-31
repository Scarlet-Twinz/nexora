import fp from 'fastify-plugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccess } from '../lib/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      userId: string;
      tenantId?: string;
      role?: string;
      email?: string;
    };
  }

  interface FastifyInstance {
    requireRole(role: string): (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export default fp(async (fastify) => {
  fastify.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) return;

    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = verifyAccess(token) as any;
      request.auth = payload;
    } catch {
      // Invalid token — protected routes will enforce authentication.
    }
  });

  fastify.decorate(
    'requireRole',
    (requiredRole: string) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = request.auth;

        if (!auth) {
          await reply.code(401).send({ error: 'unauthenticated' });
          return;
        }

        const order: Record<string, number> = {
          VIEWER: 1,
          MEMBER: 2,
          ADMIN: 3,
          OWNER: 4,
        };

        if (
          (order[auth.role || ''] || 0) <
          (order[requiredRole] || 0)
        ) {
          await reply.code(403).send({ error: 'forbidden' });
        }
      }
  );
});