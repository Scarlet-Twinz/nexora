import { FastifyInstance } from 'fastify';
import prisma from '@nexora/db/src';
import { setTenantSession } from '../db';
import { z } from 'zod';

type AuthContext = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  description: z.string().nullable().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
});

export default async function projectRoutes(fastify: FastifyInstance) {
  const setTenant = async (request: any) => {
    const auth = request.auth as AuthContext;

    try {
      await setTenantSession(auth.tenantId);
    } catch {
      // Prisma queries explicitly scope by tenantId.
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

      const parsed = CreateProjectSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid request body',
          details: parsed.error.flatten(),
        });
      }

      const project = await prisma.project.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          tenantId: auth.tenantId,
          createdBy: auth.userId,
        },
      });

      return reply.code(201).send(project);
    }
  );

  // List projects — tenant scoped + pagination
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
      const query = request.query as {
        page?: string;
        per?: string;
      };

      const page = Math.max(1, Number(query.page || 1));
      const per = Math.min(50, Math.max(1, Number(query.per || 10)));

      const projects = await prisma.project.findMany({
        where: {
          tenantId: auth.tenantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * per,
        take: per,
      });

      return reply.send({
        items: projects,
        page,
        per,
      });
    }
  );

  // Get single project — tenant scoped
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

      const parsed = UpdateProjectSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid request body',
          details: parsed.error.flatten(),
        });
      }

      const updated = await prisma.project.updateMany({
        where: {
          id,
          tenantId: auth.tenantId,
        },
        data: {
          ...(parsed.data.name !== undefined
            ? { name: parsed.data.name }
            : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description }
            : {}),
          updatedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return reply.code(404).send({
          error: 'not found',
        });
      }

      const project = await prisma.project.findFirst({
        where: {
          id,
          tenantId: auth.tenantId,
        },
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