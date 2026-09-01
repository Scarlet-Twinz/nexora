import { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';

const connection = {
  host: new URL(
    process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  ).hostname,
  port: Number(
    new URL(
      process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    ).port || 6379
  ),
};

export default async function healthJobs(
  fastify: FastifyInstance
) {
  const defaultQueue = new Queue('default', {
    connection,
  });

  fastify.get('/jobs/health', async () => {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
    ] = await Promise.all([
      defaultQueue.getWaitingCount(),
      defaultQueue.getActiveCount(),
      defaultQueue.getCompletedCount(),
      defaultQueue.getFailedCount(),
      defaultQueue.getDelayedCount(),
    ]);

    return {
      status: 'ok',
      queue: 'default',
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      timestamp: new Date().toISOString(),
    };
  });

  fastify.addHook('onClose', async () => {
    await defaultQueue.close();
  });
}