import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';

const fastify = Fastify({ logger: true });

// Register cookie plugin
fastify.register(fastifyCookie);

// Register auth plugin
fastify.register(authPlugin);

// Register auth routes
fastify.register(authRoutes);

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