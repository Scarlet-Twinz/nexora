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

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  description: z.string().nullable().optional(),
  assigneeId: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().trim().min(1).optional(),
  assigneeId: z.string().nullable().optional(),
});

export default async function taskRoutes(fastify: FastifyInstance) {
  const setTenant = async (request: any) => {
    const auth = request.auth as AuthContext;

    try {
      await setTenantSession(auth.tenantId);
    } catch {
      // Prisma queries explicitly scope through the tenant's project.
    }
  };

  // Create task — MEMBER+
  fastify.post(
    '/projects/:projectId/tasks',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
        fastify.requireRole('MEMBER'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId } = request.params as {
        projectId: string;
      };

      const parsed = CreateTaskSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid request body',
          details: parsed.error.flatten(),
        });
      }

      // Verify the project belongs to the authenticated tenant.
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: auth.tenantId,
        },
      });

      if (!project) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      // If an assignee is supplied, make sure that user belongs
      // to the same tenant.
      if (parsed.data.assigneeId) {
        const membership = await prisma.membership.findFirst({
          where: {
            tenantId: auth.tenantId,
            userId: parsed.data.assigneeId,
          },
        });

        if (!membership) {
          return reply.code(400).send({
            error: 'assignee is not a member of this tenant',
          });
        }
      }

      const task = await prisma.task.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          projectId,
          ...(parsed.data.assigneeId
            ? { assigneeId: parsed.data.assigneeId }
            : {}),
        },
      });

      return reply.code(201).send(task);
    }
  );

  // List tasks — tenant scoped + pagination
  fastify.get(
    '/projects/:projectId/tasks',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId } = request.params as {
        projectId: string;
      };

      const query = request.query as {
        page?: string;
        per?: string;
      };

      const page = Math.max(1, Number(query.page || 1));
      const per = Math.min(50, Math.max(1, Number(query.per || 10)));

      // First verify the project belongs to this tenant.
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: auth.tenantId,
        },
      });

      if (!project) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      const tasks = await prisma.task.findMany({
        where: {
          projectId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip: (page - 1) * per,
        take: per,
      });

      return reply.send({
        items: tasks,
        page,
        per,
      });
    }
  );

  // Update task — MEMBER+
  fastify.put(
    '/projects/:projectId/tasks/:taskId',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
        fastify.requireRole('MEMBER'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId, taskId } = request.params as {
        projectId: string;
        taskId: string;
      };

      const parsed = UpdateTaskSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid request body',
          details: parsed.error.flatten(),
        });
      }

      // Verify project belongs to tenant.
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: auth.tenantId,
        },
      });

      if (!project) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      // If changing assignee, verify the user belongs to this tenant.
      if (parsed.data.assigneeId) {
        const membership = await prisma.membership.findFirst({
          where: {
            tenantId: auth.tenantId,
            userId: parsed.data.assigneeId,
          },
        });

        if (!membership) {
          return reply.code(400).send({
            error: 'assignee is not a member of this tenant',
          });
        }
      }

      const updated = await prisma.task.updateMany({
        where: {
          id: taskId,
          projectId,
        },
        data: {
          ...(parsed.data.title !== undefined
            ? { title: parsed.data.title }
            : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description }
            : {}),
          ...(parsed.data.status !== undefined
            ? { status: parsed.data.status }
            : {}),
          ...(parsed.data.assigneeId !== undefined
            ? { assigneeId: parsed.data.assigneeId }
            : {}),
          updatedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return reply.code(404).send({
          error: 'task not found',
        });
      }

      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
        },
      });

      return reply.send(task);
    }
  );

  // Delete task — ADMIN+
  fastify.delete(
    '/projects/:projectId/tasks/:taskId',
    {
      preHandler: [
        fastify.authenticate,
        setTenant,
        fastify.requireRole('ADMIN'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId, taskId } = request.params as {
        projectId: string;
        taskId: string;
      };

      // Verify project belongs to tenant.
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: auth.tenantId,
        },
      });

      if (!project) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      const deleted = await prisma.task.deleteMany({
        where: {
          id: taskId,
          projectId,
        },
      });

      if (deleted.count === 0) {
        return reply.code(404).send({
          error: 'task not found',
        });
      }

      return reply.send({
        ok: true,
      });
    }
  );
}