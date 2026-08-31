import { FastifyInstance } from 'fastify';
import prisma from '@nexora/db/src';
import { setTenantSession } from '../db';

type AuthContext = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

export default async function projectRoutes(fastify: FastifyInstance) {
  const setTenant = async (request: any) => {
    const auth = request.auth as AuthContext;

    try {
      await setTenantSession(auth.tenantId);
    } catch {
      // Best effort for now.
      // Prisma queries still explicitly scope by tenantId.
    }
  };

  // Create project — MEMBER+
  fastify.post(
    '/projects',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
        fastify.requireRole('MEMBER'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;
      const body = request.body as any;

      if (!body?.name) {
        return reply.code(400).send({
          error: 'name required',
        });
      }

      const project = await prisma.project.create({
        data: {
          name: body.name,
          description: body.description || null,
          tenantId: auth.tenantId,
          createdBy: auth.userId,
        },
      });

      return reply.code(201).send(project);
    }
  );

  // List projects
  fastify.get(
    '/projects',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const projects = await prisma.project.findMany({
        where: {
          tenantId: auth.tenantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(projects);
    }
  );

  // Get single project
  fastify.get(
    '/projects/:id',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;
      const { id } = request.params as { id: string };

      const project = await prisma.project.findFirst({
        where: {
          id,
          tenantId: auth.tenantId,
        },
      });

      if (!project) {
        return reply.code(404).send({
          error: 'not found',
        });
      }

      return reply.send(project);
    }
  );

  // Update project — ADMIN+
  fastify.put(
    '/projects/:id',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
        fastify.requireRole('ADMIN'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const updated = await prisma.project.updateMany({
        where: {
          id,
          tenantId: auth.tenantId,
        },
        data: {
          name: body?.name,
          description: body?.description,
          updatedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return reply.code(404).send({
          error: 'not found',
        });
      }

      const project = await prisma.project.findUnique({
        where: { id },
      });

      return reply.send(project);
    }
  );

  // Delete project — OWNER only
  fastify.delete(
    '/projects/:id',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
        fastify.requireRole('OWNER'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;
      const { id } = request.params as { id: string };

      const deleted = await prisma.project.deleteMany({
        where: {
          id,
          tenantId: auth.tenantId,
        },
      });

      if (deleted.count === 0) {
        return reply.code(404).send({
          error: 'not found',
        });
      }

      return reply.send({
        ok: true,
      });
    }
  );
}