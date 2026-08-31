import fp from 'fastify-plugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccess } from '../lib/jwt';

type AuthPayload = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthPayload;
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    requireRole(role: string): (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export default fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        await reply.code(401).send({ error: 'unauthenticated' });
        return;
      }

      const token = authHeader.slice(7);

      try {
        const payload = verifyAccess(token) as AuthPayload;

        if (!payload.userId || !payload.tenantId || !payload.role) {
          await reply.code(401).send({ error: 'invalid authentication' });
          return;
        }

        request.auth = payload;
      } catch {
        await reply.code(401).send({ error: 'invalid token' });
      }
    }
  );

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
          (order[auth.role] || 0) <
          (order[requiredRole] || 0)
        ) {
          await reply.code(403).send({ error: 'forbidden' });
        }
      }
  );
});