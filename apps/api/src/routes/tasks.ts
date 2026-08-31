import { FastifyInstance } from 'fastify';
import prisma from '@nexora/db/src';
import { setTenantSession } from '../db';

type AuthContext = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

export default async function taskRoutes(fastify: FastifyInstance) {
  const setTenant = async (request: any) => {
    const auth = request.auth as AuthContext;

    try {
      await setTenantSession(auth.tenantId);
    } catch {
      // Best effort for now.
      // Prisma queries still explicitly scope by tenantId.
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
      const { title, description, assigneeId } =
        request.body as any;

      if (!title) {
        return reply.code(400).send({
          error: 'title required',
        });
      }

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

      const task = await prisma.task.create({
        data: {
          title,
          description: description || null,
          projectId,
          ...(assigneeId ? { assigneeId } : {}),
        },
      });

      return reply.code(201).send(task);
    }
  );

  // List tasks
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
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send(tasks);
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
      const body = request.body as any;

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

      const updated = await prisma.task.updateMany({
        where: {
          id: taskId,
          projectId,
        },
        data: {
          ...(body?.title !== undefined
            ? { title: body.title }
            : {}),
          ...(body?.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body?.status !== undefined
            ? { status: body.status }
            : {}),
        },
      });

      if (updated.count === 0) {
        return reply.code(404).send({
          error: 'task not found',
        });
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
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