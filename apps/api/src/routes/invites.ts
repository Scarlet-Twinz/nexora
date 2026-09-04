import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { Queue } from 'bullmq';
import prisma from '@nexora/db/src';
import { withTenant } from '../db';

const redisUrl = new URL(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379'
);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  ...(redisUrl.password
    ? {
        password: decodeURIComponent(
          redisUrl.password
        ),
      }
    : {}),
};

const queue = new Queue('default', {
  connection,
});

export default async function inviteRoutes(
  fastify: FastifyInstance
) {
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
      const auth = request.auth;

      const body = request.body as any;

      const email = (body?.email || '')
        .trim()
        .toLowerCase();

      const role = body?.role || 'MEMBER';

      if (!email) {
        return reply.code(400).send({
          error: 'email required',
        });
      }

      const result = await withTenant(
        auth.tenantId,
        async (tx) => {
          const existingMembership =
            await tx.membership.findFirst({
              where: {
                tenantId: auth.tenantId,
                user: {
                  email,
                },
              },
            });

          if (existingMembership) {
            return {
              type: 'already_member' as const,
            };
          }

          const token = nanoid(32);

          const expiresAt = new Date(
            Date.now() +
              1000 * 60 * 60 * 24 * 7
          );

          const invite =
            await tx.invite.create({
              data: {
                token,
                email,
                tenantId: auth.tenantId,
                role,
                createdBy: auth.userId,
                expiresAt,
              },
            });

          return {
            type: 'created' as const,
            invite,
          };
        }
      );

      if (
        result.type ===
        'already_member'
      ) {
        return reply.code(409).send({
          error: 'user is already a member',
        });
      }

      const invite = result.invite;

      // Carry tenant context across the async boundary so the worker
      // can re-establish the same database RLS context.
      await queue.add(
        'send-invite',
        {
          inviteId: invite.id,
          tenantId: auth.tenantId,
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

  // Accept invite — public
  // The invite token is used only to discover the tenant. Once the tenant
  // is known, protected operations run with the transaction-local context.
  fastify.post(
    '/invites/accept',
    async (request: any, reply) => {
      const { token } = request.body as {
        token?: string;
      };

      if (!token) {
        return reply.code(400).send({
          error: 'token required',
        });
      }

      const result =
        await prisma.$transaction(
          async (tx: any) => {
            // Token lookup must remain available before tenant context exists.
            const invite =
              await tx.invite.findUnique({
                where: {
                  token,
                },
              });

            if (!invite) {
              return {
                type: 'invalid' as const,
              };
            }

            if (
              invite.expiresAt <
              new Date()
            ) {
              return {
                type: 'expired' as const,
              };
            }

            if (invite.accepted) {
              return {
                type: 'accepted' as const,
              };
            }

            await tx.$executeRaw`
              SELECT set_config(
                'app.tenant_id',
                ${invite.tenantId},
                true
              )
            `;

            const user =
              await tx.user.findUnique({
                where: {
                  email: invite.email,
                },
              });

            if (!user) {
              return {
                type: 'signup' as const,
                email: invite.email,
                token: invite.token,
              };
            }

            const existingMembership =
              await tx.membership.findUnique({
                where: {
                  tenantId_userId: {
                    tenantId:
                      invite.tenantId,
                    userId: user.id,
                  },
                },
              });

            if (existingMembership) {
              await tx.invite.update({
                where: {
                  id: invite.id,
                },
                data: {
                  accepted: true,
                },
              });

              return {
                type: 'already_member' as const,
              };
            }

            await tx.membership.create({
              data: {
                userId: user.id,
                tenantId:
                  invite.tenantId,
                role: invite.role,
              },
            });

            await tx.invite.update({
              where: {
                id: invite.id,
              },
              data: {
                accepted: true,
              },
            });

            return {
              type: 'joined' as const,
            };
          }
        );

      if (result.type === 'invalid') {
        return reply.code(404).send({
          error: 'invalid token',
        });
      }

      if (result.type === 'expired') {
        return reply.code(410).send({
          error: 'invite expired',
        });
      }

      if (result.type === 'accepted') {
        return reply.code(409).send({
          error: 'invite already accepted',
        });
      }

      if (result.type === 'signup') {
        return reply.send({
          action: 'signup',
          email: result.email,
          token: result.token,
        });
      }

      if (
        result.type ===
        'already_member'
      ) {
        return reply.send({
          action: 'already_member',
        });
      }

      return reply.send({
        action: 'joined',
      });
    }
  );
}
