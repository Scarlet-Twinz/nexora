import { Worker } from 'bullmq';
import prisma from '@nexora/db/src';
import nodemailer from 'nodemailer';

const redisUrl = new URL(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379'
);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  ...(redisUrl.password
    ? { password: decodeURIComponent(redisUrl.password) }
    : {}),
};

const worker = new Worker(
  'default',
  async (job) => {
    if (job.name !== 'send-invite') {
      return;
    }

    const { inviteId } = job.data as {
      inviteId: string;
    };

    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error(`Invite not found: ${inviteId}`);
    }

    const inviteUrl =
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}` +
      `/accept-invite?token=${invite.token}`;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
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
        text: `You've been invited to join Nexora. Accept your invite here: ${inviteUrl}`,
        html: `<p>You've been invited to join Nexora.</p>
               <p><a href="${inviteUrl}">Accept your invite</a></p>`,
      });

      console.log('Invite email sent:', invite.email);
    } else {
      console.log(
        `Invite link for ${invite.email}: ${inviteUrl}`
      );
    }
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on('completed', (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(
    `Job failed: ${job?.id}`,
    error.message
  );
});

console.log('Nexora worker listening for jobs...');