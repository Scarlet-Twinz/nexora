import dotenv from 'dotenv';

// Load local .env only in development.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// NOTE: Do NOT log secrets or secret fragments
// Vercel entrypoint: Fastify zero-configuration deployment.

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';

import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import inviteRoutes from './routes/invites';
import stripeRoutes from './routes/stripe';
import healthJobs from './routes/health-jobs';

const fastify = Fastify({ logger: true });

const frontendOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://nexora1-nine.vercel.app',
  'https://nexora1-scalet-twinz-s-projects.vercel.app',
  'https://nexora1-iopljvzn7-scalet-twinz-s-projects.vercel.app',
  'https://nexora1-git-scarlet-twinz-nexora-4e512e-scalet-twinz-s-projects.vercel.app',
];

// CORS
// Keep explicit known origins, while allowing preview URLs generated for this
// Nexora Vercel project. Credentials remain enabled; wildcard "*" is not used.
fastify.register(fastifyCors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isKnownOrigin = frontendOrigins.includes(origin);
    const isNexoraPreview =
      /^https:\/\/nexora1-[a-z0-9-]+-scalet-twinz-s-projects\.vercel\.app$/.test(origin);

    callback(null, isKnownOrigin || isNexoraPreview);
  },
  credentials: true,
});

// Cookies
fastify.register(fastifyCookie);

// Auth
fastify.register(authPlugin);

// Routes
fastify.register(authRoutes);
fastify.register(projectRoutes);
fastify.register(taskRoutes);
fastify.register(inviteRoutes);
fastify.register(stripeRoutes);
fastify.register(healthJobs);

// Health
fastify.get('/health', async () => ({
  status: 'ok',
}));

const start = async () => {
  try {
    await fastify.listen({
      port: Number(process.env.PORT) || 4000,
      host: '0.0.0.0',
    });

    console.log('API listening');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
