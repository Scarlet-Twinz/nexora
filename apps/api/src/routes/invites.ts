import { FastifyInstance } from 'fastify';
import prisma from '@nexora/db/src';
import { nanoid } from 'nanoid';
import { setTenantSession } from '../db';
import { Queue } from 'bullmq';

const redisUrl = new URL(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379'
);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  ...(redisUrl.password
    ? { password: decodeURIComponent(redisUrl.password) }
    : {}),
};

const queue = new Queue('default', { connection });

export default async function inviteRoutes(
  fastify: FastifyInstance
) {
  const requireAuthAndTenant = async (
    request: any,
    reply: any
  ) => {
    const auth = request.auth;

    if (!auth?.userId || !auth?.tenantId) {
      await reply
        .code(401)
        .send({ error: 'unauthenticated' });
      return;
    }

    try {
      await setTenantSession(auth.tenantId);
    } catch {
      // Tenant is still enforced by Prisma queries.
    }
  };

  // Create invite — ADMIN+
  fastify.post(
    '/invites',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole('ADMIN'),
      ],
    },
    async (request: any, reply) => {
      const body = request.body as any;

      const email = (body?.email || '').toLowerCase();
      const role = body?.role || 'MEMBER';

      if (!email) {
        return reply
          .code(400)
          .send({ error: 'email required' });
      }

      const existingMembership =
        await prisma.membership.findFirst({
          where: {
            tenantId: request.auth.tenantId,
            user: {
              email,
            },
          },
        });

      if (existingMembership) {
        return reply
          .code(409)
          .send({
            error: 'user is already a member',
          });
      }

      const token = nanoid(32);

      const expiresAt = new Date(
        Date.now() +
          1000 * 60 * 60 * 24 * 7
      );

      const invite = await prisma.invite.create({
        data: {
          token,
          email,
          tenantId: request.auth.tenantId,
          role,
          createdBy: request.auth.userId,
          expiresAt,
        },
      });

      await queue.add(
        'send-invite',
        {
          inviteId: invite.id,
        },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      );

      return reply.code(201).send({
        id: invite.id,
        token: invite.token,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      });
    }
  );

  // Accept invite
  fastify.post(
    '/invites/accept',
    async (request, reply) => {
      const { token } = request.body as {
        token?: string;
      };

      if (!token) {
        return reply
          .code(400)
          .send({ error: 'token required' });
      }

      const invite = await prisma.invite.findUnique({
        where: { token },
      });

      if (!invite) {
        return reply
          .code(404)
          .send({ error: 'invalid token' });
      }

      if (invite.expiresAt < new Date()) {
        return reply
          .code(410)
          .send({ error: 'invite expired' });
      }

      if (invite.accepted) {
        return reply
          .code(409)
          .send({
            error: 'invite already accepted',
          });
      }

      const user = await prisma.user.findUnique({
        where: {
          email: invite.email,
        },
      });

      if (!user) {
        return reply.send({
          action: 'signup',
          email: invite.email,
          token: invite.token,
        });
      }

      const existingMembership =
        await prisma.membership.findUnique({
          where: {
            tenantId_userId: {
              tenantId: invite.tenantId,
              userId: user.id,
            },
          },
        });

      if (existingMembership) {
        await prisma.invite.update({
          where: { id: invite.id },
          data: { accepted: true },
        });

        return reply.send({
          action: 'already_member',
        });
      }

      await prisma.membership.create({
        data: {
          userId: user.id,
          tenantId: invite.tenantId,
          role: invite.role,
        },
      });

      await prisma.invite.update({
        where: { id: invite.id },
        data: { accepted: true },
      });

      return reply.send({
        action: 'joined',
      });
    }
  );
}