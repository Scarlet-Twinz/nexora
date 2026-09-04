import {
  Worker,
  Queue,
} from 'bullmq';
import prisma from '@nexora/db/src';
import nodemailer from 'nodemailer';

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

const defaultQueue = new Queue('default', {
  connection,
});

const deadLetterQueue = new Queue('dead-letter', {
  connection,
});

// Re-establish the transaction-local tenant context before a worker
// touches tenant-owned data. This keeps background jobs subject to the
// same PostgreSQL RLS boundary as API requests.
async function withTenant<T>(
  tenantId: string,
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error('tenantId is required for tenant-scoped job');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config(
        'app.tenant_id',
        ${tenantId},
        true
      )
    `;

    return callback(tx as typeof prisma);
  });
}

const worker = new Worker(
  'default',
  async (job) => {
    console.log(
      `Processing job ${job.id}: ${job.name} ` +
        `(attempt ${job.attemptsMade + 1})`
    );

    switch (job.name) {
      case 'send-invite': {
        const { inviteId, tenantId } = job.data as {
          inviteId: string;
          tenantId: string;
        };

        if (!inviteId || !tenantId) {
          throw new Error(
            'send-invite job requires inviteId and tenantId'
          );
        }

        const result = await withTenant(
          tenantId,
          async (tx) => {
            const invite =
              await tx.invite.findUnique({
                where: { id: inviteId },
              });

            if (!invite) {
              throw new Error(
                `Invite not found: ${inviteId}`
              );
            }

            const inviteUrl =
              `${process.env.FRONTEND_URL || 'http://localhost:3000'}` +
              `/accept-invite?token=${invite.token}`;

            if (
              process.env.SMTP_HOST &&
              process.env.SMTP_USER
            ) {
              const transporter =
                nodemailer.createTransport({
                  host: process.env.SMTP_HOST,
                  port: Number(
                    process.env.SMTP_PORT || 587
                  ),
                  secure:
                    process.env.SMTP_SECURE === 'true',
                  auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                  },
                });

              await transporter.sendMail({
                from:
                  process.env.SMTP_FROM ||
                  '"Nexora" <no-reply@nexora.local>',
                to: invite.email,
                subject: "You're invited to Nexora",
                text:
                  `You've been invited to join Nexora. ` +
                  `Accept your invite here: ${inviteUrl}`,
                html:
                  `<p>You've been invited to Nexora.</p>` +
                  `<p><a href="${inviteUrl}">Accept your invite</a></p>`,
              });

              console.log(
                `Invite email sent: ${invite.email}`
              );
            } else {
              console.log(
                `Invite link for ${invite.email}: ${inviteUrl}`
              );
            }

            return {
              inviteId,
              email: invite.email,
            };
          }
        );

        return {
          type: 'send-invite',
          ...result,
        };
      }

      case 'process-webhook': {
        console.log(
          `Processing webhook job ${job.id}`
        );

        return {
          type: 'process-webhook',
          processed: true,
        };
      }

      case 'worker-health-check': {
        console.log(
          'Worker health check completed'
        );

        return {
          type: 'worker-health-check',
          timestamp:
            new Date().toISOString(),
          status: 'healthy',
        };
      }

      default:
        throw new Error(
          `Unknown job type: ${job.name}`
        );
    }
  },
  {
    connection,
    concurrency: 6,
  }
);

worker.on(
  'completed',
  async (job, result) => {
    console.log(
      `Job completed: ${job.id} (${job.name})`,
      result
    );
  }
);

worker.on(
  'failed',
  async (job, error) => {
    console.error(
      `Job failed: ${job?.id} (${job?.name})`,
      error.message
    );

    if (!job) return;

    console.error(
      `Attempt ${job.attemptsMade} failed`
    );

    if (
      job.opts.attempts &&
      job.attemptsMade >= job.opts.attempts
    ) {
      try {
        await deadLetterQueue.add(
          'failed-job',
          {
            originalJobId: job.id,
            originalJobName: job.name,
            data: job.data,
            failedReason:
              error.message,
            attemptsMade:
              job.attemptsMade,
            failedAt:
              new Date().toISOString(),
          },
          {
            removeOnComplete: true,
          }
        );

        console.error(
          `Job moved to DLQ: ${job.id}`
        );
      } catch (dlqError) {
        console.error(
          'Failed to move job to DLQ:',
          dlqError
        );
      }
    }
  }
);

worker.on('error', (error) => {
  console.error('========== WORKER ERROR ==========');
  console.error(error);
  console.error('===================================');
});

worker.on(
  'ready',
  () => {
    console.log(
      'Nexora worker connected to Redis'
    );
  }
);

worker.on(
  'closing',
  () => {
    console.log(
      'Nexora worker shutting down...'
    );
  }
);

const scheduleHealthCheck =
  async () => {
    try {
      await defaultQueue.add(
        'worker-health-check',
        {},
        {
          repeat: {
            every: 5 * 60 * 1000,
          },
          jobId:
            'nexora-worker-health-check',
          removeOnComplete: 20,
          removeOnFail: 20,
        }
      );

      console.log(
        'Worker health-check scheduled'
      );
    } catch (error) {
      console.error(
        'Failed to schedule health-check:',
        error
      );
    }
  };

scheduleHealthCheck();

console.log(
  'Nexora worker listening for jobs...'
);

export {
  worker,
  defaultQueue,
  deadLetterQueue,
};
