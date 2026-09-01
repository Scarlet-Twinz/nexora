import dotenv from 'dotenv';

dotenv.config({
  path: '../../.env',
   override: true,
});

console.log(
  'STRIPE KEY LOADED:',
  process.env.STRIPE_SECRET_KEY?.slice(0, 12)
);

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import inviteRoutes from './routes/invites';
import stripeRoutes from './routes/stripe';

const fastify = Fastify({ logger: true });

// Register cookie plugin
fastify.register(fastifyCookie);

// Register auth plugin
fastify.register(authPlugin);

// Register auth routes
fastify.register(authRoutes);

// Register project routes
fastify.register(projectRoutes);

// Register task routes
fastify.register(taskRoutes);

fastify.register(inviteRoutes);

fastify.register(stripeRoutes);

// Health
fastify.get('/health', async () => ({
  status: 'ok',
}));

const start = async () => {
  try {
    await fastify.listen({
      port: 4000,
      host: '0.0.0.0',
    });

    console.log('API listening on 4000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();