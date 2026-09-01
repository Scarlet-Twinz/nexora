import { FastifyInstance } from 'fastify';
import prisma from '@nexora/db/src';
import bcrypt from 'bcryptjs';
import {
  signAccess,
  signRefresh,
  verifyRefresh,
} from '../lib/jwt';

export default async function authRoutes(fastify: FastifyInstance) {
  // Signup
  // Normal signup -> creates Tenant + User + OWNER membership.
  // Invite signup -> creates User + membership in the invited tenant.
  fastify.post('/auth/signup', async (request, reply) => {
    const body = request.body as any;

    const email = (body?.email || '').toLowerCase().trim();
    const password = body?.password || '';
    const inviteToken = body?.inviteToken || '';

    const tenantName =
      body?.tenantName || `${email.split('@')[0]}'s Org`;

    if (!email || !password) {
      return reply
        .code(400)
        .send({ error: 'email and password required' });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return reply.code(409).send({ error: 'user exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    /*
     * INVITED SIGNUP
     *
     * If an inviteToken is supplied, the user joins the
     * existing tenant instead of creating a new tenant.
     */
    if (inviteToken) {
      try {
        const result = await prisma.$transaction(async (tx: any) => {
          const invite = await tx.invite.findUnique({
            where: { token: inviteToken },
          });

          if (!invite) {
            throw new Error('INVITE_NOT_FOUND');
          }

          if (invite.accepted) {
            throw new Error('INVITE_ACCEPTED');
          }

          if (invite.expiresAt < new Date()) {
            throw new Error('INVITE_EXPIRED');
          }

          if (invite.email.toLowerCase() !== email) {
            throw new Error('INVITE_EMAIL_MISMATCH');
          }

          const user = await tx.user.create({
            data: {
              email,
              password: hashed,
              name: body?.name || null,
            },
          });

          await tx.membership.create({
            data: {
              userId: user.id,
              tenantId: invite.tenantId,
              role: invite.role,
            },
          });

          await tx.invite.update({
            where: { id: invite.id },
            data: {
              accepted: true,
            },
          });

          return {
            userId: user.id,
            tenantId: invite.tenantId,
            role: invite.role,
          };
        });

        return reply.code(201).send({
          userId: result.userId,
          tenantId: result.tenantId,
          role: result.role,
          joined: true,
        });
      } catch (error: any) {
        switch (error?.message) {
          case 'INVITE_NOT_FOUND':
            return reply.code(404).send({
              error: 'invalid invite token',
            });

          case 'INVITE_ACCEPTED':
            return reply.code(409).send({
              error: 'invite already accepted',
            });

          case 'INVITE_EXPIRED':
            return reply.code(410).send({
              error: 'invite expired',
            });

          case 'INVITE_EMAIL_MISMATCH':
            return reply.code(403).send({
              error: 'invite email does not match signup email',
            });

          default:
            throw error;
        }
      }
    }

    /*
     * NORMAL SIGNUP
     *
     * No invite token -> create a new tenant and make
     * the new user its OWNER.
     */
    const slug = tenantName
      .toLowerCase()
      .replace(/\s+/g, '-');

    const result = await prisma.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          name: body?.name || null,
          memberships: {
            create: {
              tenantId: tenant.id,
              role: 'OWNER',
            },
          },
        },
      });

      return { tenant, user };
    });

    return reply.code(201).send({
      tenantId: result.tenant.id,
      userId: result.user.id,
    });
  });

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply
        .code(400)
        .send({ error: 'email/password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!user) {
      return reply
        .code(401)
        .send({ error: 'invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return reply
        .code(401)
        .send({ error: 'invalid credentials' });
    }

    const primary = user.memberships[0];

    const payload = {
      userId: user.id,
      tenantId: primary?.tenantId,
      role: primary?.role,
      email: user.email,
    };

    const access = signAccess(payload);
    const refresh = signRefresh({ userId: user.id });

    reply.setCookie('refreshToken', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return reply.send({ access });
  });

  // Refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const cookie = request.cookies?.refreshToken;

    if (!cookie) {
      return reply
        .code(401)
        .send({ error: 'no refresh token' });
    }

    try {
      const data = verifyRefresh(cookie) as any;

      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { memberships: true },
      });

      if (!user) {
        return reply
          .code(401)
          .send({ error: 'invalid refresh' });
      }

      const primary = user.memberships[0];

      const payload = {
        userId: user.id,
        tenantId: primary?.tenantId,
        role: primary?.role,
        email: user.email,
      };

      const access = signAccess(payload);
      const newRefresh = signRefresh({ userId: user.id });

      reply.setCookie('refreshToken', newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return reply.send({ access });
    } catch (err) {
      return reply
        .code(401)
        .send({ error: 'invalid refresh' });
    }
  });

  // Logout
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', {
      path: '/',
    });

    return reply.send({ ok: true });
  });
}