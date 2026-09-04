import fp from 'fastify-plugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccess } from '../lib/jwt';
import prisma from '@nexora/db/src';
import { withTenant } from '../db';

type AuthPayload = {
  userId: string;
  tenantId?: string;
  role?: string;
  email?: string;
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

        if (!payload.userId) {
          await reply.code(401).send({
            error: 'invalid authentication',
          });
          return;
        }

        let role = payload.role;
        let tenantId = payload.tenantId;

        if (payload.tenantId) {
          // Membership is RLS-protected. Establish the tenant context
          // before validating the JWT's tenant membership.
          const membership = await withTenant(
            payload.tenantId,
            async (tx) =>
              tx.membership.findUnique({
                where: {
                  tenantId_userId: {
                    tenantId: payload.tenantId as string,
                    userId: payload.userId,
                  },
                },
              })
          );

          if (!membership) {
            await reply.code(401).send({
              error: 'membership not found',
            });
            return;
          }

          role = membership.role;
          tenantId = membership.tenantId;
        }

        request.auth = {
          userId: payload.userId,
          tenantId,
          role,
          email: payload.email,
        };
      } catch {
        await reply.code(401).send({
          error: 'invalid token',
        });
      }
    }
  );

  fastify.decorate(
    'requireRole',
    (requiredRole: string) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = request.auth;

        if (!auth?.userId) {
          await reply.code(401).send({
            error: 'unauthenticated',
          });
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
          await reply.code(403).send({
            error: 'forbidden',
          });
        }
      }
  );
});
