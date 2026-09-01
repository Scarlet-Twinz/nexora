import { FastifyInstance } from 'fastify';
import { withTenant } from '../db';
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
});

const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().trim().min(1).optional(),
});

export default async function taskRoutes(
  fastify: FastifyInstance
) {
  // Create task — MEMBER+
  fastify.post(
    '/projects/:projectId/tasks',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole('MEMBER'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId } = request.params as {
        projectId: string;
      };

      const parsed = CreateTaskSchema.safeParse(
        request.body
      );

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid request body',
          details: parsed.error.flatten(),
        });
      }

      const task = await withTenant(
        auth.tenantId,
        async (tx) => {
          const project =
            await tx.project.findFirst({
              where: {
                id: projectId,
                tenantId: auth.tenantId,
              },
            });

          if (!project) {
            return null;
          }

          return tx.task.create({
            data: {
              title: parsed.data.title,
              description:
                parsed.data.description ?? null,
              projectId,
            },
          });
        }
      );

      if (!task) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      return reply.code(201).send(task);
    }
  );

  // List tasks — tenant scoped + pagination
  fastify.get(
    '/projects/:projectId/tasks',
    {
      preHandler: [
        fastify.authenticate,
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

      const page = Math.max(
        1,
        Number(query.page || 1)
      );

      const per = Math.min(
        50,
        Math.max(
          1,
          Number(query.per || 10)
        )
      );

      const result = await withTenant(
        auth.tenantId,
        async (tx) => {
          const project =
            await tx.project.findFirst({
              where: {
                id: projectId,
                tenantId: auth.tenantId,
              },
            });

          if (!project) {
            return null;
          }

          const tasks =
            await tx.task.findMany({
              where: {
                projectId,
              },
              orderBy: {
                createdAt: 'asc',
              },
              skip: (page - 1) * per,
              take: per,
            });

          return tasks;
        }
      );

      if (result === null) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      return reply.send({
        items: result,
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
        fastify.requireRole('MEMBER'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId, taskId } =
        request.params as {
          projectId: string;
          taskId: string;
        };

      const parsed =
        UpdateTaskSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid request body',
          details: parsed.error.flatten(),
        });
      }

      const result = await withTenant(
        auth.tenantId,
        async (tx) => {
          const project =
            await tx.project.findFirst({
              where: {
                id: projectId,
                tenantId: auth.tenantId,
              },
            });

          if (!project) {
            return {
              type: 'project_not_found' as const,
            };
          }

          const updated =
            await tx.task.updateMany({
              where: {
                id: taskId,
                projectId,
              },
              data: {
                ...(parsed.data.title !==
                undefined
                  ? {
                      title:
                        parsed.data.title,
                    }
                  : {}),
                ...(parsed.data.description !==
                undefined
                  ? {
                      description:
                        parsed.data.description,
                    }
                  : {}),
                ...(parsed.data.status !==
                undefined
                  ? {
                      status:
                        parsed.data.status,
                    }
                  : {}),
                updatedAt: new Date(),
              },
            });

          if (updated.count === 0) {
            return {
              type: 'task_not_found' as const,
            };
          }

          const task =
            await tx.task.findFirst({
              where: {
                id: taskId,
                projectId,
              },
            });

          return {
            type: 'success' as const,
            task,
          };
        }
      );

      if (
        result.type ===
        'project_not_found'
      ) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      if (
        result.type ===
        'task_not_found'
      ) {
        return reply.code(404).send({
          error: 'task not found',
        });
      }

      return reply.send(result.task);
    }
  );

  // Delete task — ADMIN+
  fastify.delete(
    '/projects/:projectId/tasks/:taskId',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole('ADMIN'),
      ],
    },
    async (request: any, reply) => {
      const auth = request.auth as AuthContext;

      const { projectId, taskId } =
        request.params as {
          projectId: string;
          taskId: string;
        };

      const result = await withTenant(
        auth.tenantId,
        async (tx) => {
          const project =
            await tx.project.findFirst({
              where: {
                id: projectId,
                tenantId: auth.tenantId,
              },
            });

          if (!project) {
            return {
              type: 'project_not_found' as const,
            };
          }

          const deleted =
            await tx.task.deleteMany({
              where: {
                id: taskId,
                projectId,
              },
            });

          if (deleted.count === 0) {
            return {
              type: 'task_not_found' as const,
            };
          }

          return {
            type: 'success' as const,
          };
        }
      );

      if (
        result.type ===
        'project_not_found'
      ) {
        return reply.code(404).send({
          error: 'project not found',
        });
      }

      if (
        result.type ===
        'task_not_found'
      ) {
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