import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  // Double check role from DB for security
  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const plans = await prisma.plan.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({ data: { plans } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch plans' } });
    }
  } else if (req.method === 'POST') {
    const { name, slug, price, interval, currency, features, stripePriceId, description } = req.body;

    try {
      const plan = await prisma.plan.create({
        data: {
          name,
          slug,
          price,
          interval,
          currency,
          features,
          stripePriceId,
          description,
        },
      });

      res.status(201).json({ data: { plan } });
    } catch (error) {
      console.error(error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: { msg: 'Plan slug already exists' } });
      } else {
        res.status(500).json({ error: { msg: 'Failed to create plan' } });
      }
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
