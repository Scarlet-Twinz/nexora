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

// Execute worker database work inside the same transaction-local
// tenant context used by the API. This keeps queue consumers aligned
// with PostgreSQL RLS instead of relying on an unscoped Prisma client.
async function withTenant<T>(
  tenantId: string,
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
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

// Main queue
const defaultQueue = new Queue('default', {
  connection,
});

// Dead-letter queue
const deadLetterQueue = new Queue('dead-letter', {
  connection,
});

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

        if (!tenantId) {
          throw new Error(
            `Missing tenantId for invite job: ${inviteId}`
          );
        }

        const invite = await withTenant(
          tenantId,
          async (tx) => {
            return tx.invite.findFirst({
              where: {
                id: inviteId,
                tenantId,
              },
            });
          }
        );

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
            subject:
              "You're invited to Nexora",
            text:
              `You've been invited to join Nexora. ` +
              `Accept your invite here: ${inviteUrl}`,
            html:
              `<p>You've been invited to join Nexora.</p>` +
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
          type: 'send-invite',
          inviteId,
          tenantId,
          email: invite.email,
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
