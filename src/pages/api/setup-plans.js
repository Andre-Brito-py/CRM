import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const plansToCreate = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Ideal for small projects and individuals.',
      price: 0,
      currency: 'BRL',
      interval: 'month',
      stripePriceId: null, // Default free plan doesn't need Stripe price ID usually
      isActive: true,
      features: JSON.stringify([
        '1 WhatsApp Number',
        '100 Contacts',
        'Basic Support'
      ]),
    },
    {
      name: 'Standard',
      slug: 'standard',
      description: 'Perfect for growing teams and serious businesses.',
      price: 97,
      currency: 'BRL',
      interval: 'month',
      stripePriceId: 'price_PLACEHOLDER_STANDARD', // Needs to be updated in production
      isActive: true,
      features: JSON.stringify([
        '5 WhatsApp Numbers',
        'Unlimited Contacts',
        'Priority Support',
        'Basic Analytics'
      ]),
    },
    {
      name: 'Premium',
      slug: 'premium',
      description: 'Unlimited possibilities for large organizations and enterprises.',
      price: 297,
      currency: 'BRL',
      interval: 'month',
      stripePriceId: 'price_PLACEHOLDER_PREMIUM', // Needs to be updated in production
      isActive: true,
      features: JSON.stringify([
        'Unlimited WhatsApp Numbers',
        'Unlimited Contacts',
        '24/7 Phone Support',
        'Advanced Analytics',
        'AI Reply Suggestions'
      ]),
    },
  ];

  try {
    const results = [];
    for (const plan of plansToCreate) {
      // Usar upsert para evitar duplicações caso a rota seja chamada mais de uma vez
      const result = await prisma.plan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features,
          // stripePriceId: plan.stripePriceId // commented out to not overwrite if user set real stripe ids later
        },
        create: plan,
      });
      results.push(result);
    }

    return res.status(200).json({ message: 'Planos profissionais configurados com sucesso!', plans: results });
  } catch (error) {
    console.error('Error seeding plans:', error);
    return res.status(500).json({ error: 'Erro ao configurar os planos. Verifique os logs.' });
  }
};

export default handler;
