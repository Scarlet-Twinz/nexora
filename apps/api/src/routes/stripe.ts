import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import prisma from '@nexora/db/src';

export default async function stripeRoutes(
  fastify: FastifyInstance
) {
  fastify.post(
    '/stripe/create-checkout-session',
    {
      preHandler: [
        fastify.authenticate,
        async (request, reply) => {
          if (!request.auth?.tenantId) {
            return reply.code(400).send({
              error: 'tenant not found',
            });
          }
        },
      ],
    },
    async (request, reply) => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeKey) {
        return reply.code(500).send({
          error: 'Stripe is not configured',
        });
      }

      const stripe = new Stripe(stripeKey);

      const body = request.body as {
        priceId?: string;
      };

      if (!body?.priceId) {
        return reply.code(400).send({
          error: 'priceId required',
        });
      }

      const tenantId = request.auth!.tenantId as string;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return reply.code(404).send({
          error: 'tenant not found',
        });
      }

      const session =
        await stripe.checkout.sessions.create({
          mode: 'subscription',
          line_items: [
            {
              price: body.priceId,
              quantity: 1,
            },
          ],
          customer_email: request.auth!.email,
          metadata: {
            tenantId,
          },
          success_url:
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}` +
            '/billing/success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url:
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}` +
            '/billing/cancel',
        });

      return reply.send({
        url: session.url,
        sessionId: session.id,
      });
    }
  );
}
