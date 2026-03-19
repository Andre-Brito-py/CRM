import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import {
  CallToAction,
  FAQ,
  Features,
  Footer,
  Guides,
  Hero,
  Pricing,
  Stats,
  Testimonial,
} from '@/sections/index';
import { getAllPlans } from '@/prisma/services/plan';
import prisma from '@/prisma/index';

const DEFAULT_PRODUCTS = [
  {
    name: 'Starter',
    slug: 'FREE',
    description: 'Perfect for solo entrepreneurs and small side projects.',
    price: 0,
    currency: 'BRL',
    interval: 'month',
    features: ['1 WhatsApp Number', '100 Contacts', 'Basic Support'],
  },
  {
    name: 'Standard',
    slug: 'STANDARD',
    description: 'Perfect for growing teams and serious businesses.',
    price: 149,
    currency: 'BRL',
    interval: 'month',
    features: ['5 WhatsApp Numbers', 'Unlimited Contacts', 'Basic Analytics', 'Priority Support'],
  },
  {
    name: 'Premium',
    slug: 'PREMIUM',
    description: 'Unlimited possibilities for large organizations and enterprises.',
    price: 399,
    currency: 'BRL',
    interval: 'month',
    features: ['Unlimited WhatsApp Numbers', 'Advanced Analytics', 'AI Reply Suggestions', '24/7 Phone Support'],
  },
];

const isTruthyValue = (value) => {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const Home = ({ products, promo }) => {
  return (
    <LandingLayout>
      <Meta
        title="Closify CRM - Omnichannel Sales & Customer Management"
        description="The ultimate CRM platform to manage your leads, sales pipelines, and WhatsApp conversations in one place."
      />
      <Hero />
      <Stats />
      <Features />
      <Pricing products={products} promo={promo} />
      <Testimonial />
      <FAQ />
      <CallToAction />
      <Footer />
    </LandingLayout>
  );
};

const formatPlanFeatures = (features) => {
  if (Array.isArray(features)) return features;
  if (!features || typeof features !== 'object') return [];

  const list = [];

  if (features.maxUsers) {
    list.push(`${features.maxUsers} Assentos`);
  } else {
    list.push(`Assentos Ilimitados`);
  }

  if (features.maxContacts) {
    list.push(`${features.maxContacts} Contatos`);
  } else {
    list.push(`Contatos Ilimitados`);
  }

  const mods = features.allowedModules || {};
  if (mods.inbox !== false) list.push('WhatsApp Omnichannel');
  if (mods.pipeline !== false) list.push('Pipeline de Vendas');
  if (mods.ai_assistant !== false) list.push('Assistente de IA Integrado');

  if (mods.automations !== false && features.maxAutomations) {
    list.push(`${features.maxAutomations} Automações Ativas`);
  } else if (mods.automations !== false) {
    list.push(`Automações Ilimitadas`);
  }

  if (mods.payments !== false) list.push('Cobranças & Pagamentos');
  if (mods.integrations !== false) list.push('API & Webhooks');

  return list;
};

export const getStaticProps = async () => {
  let products = [];
  let promo = { enabled: false, code: '', text: '' };
  let showFree = true;
  try {
    const [plans, configs] = await Promise.all([
      getAllPlans(),
      prisma.systemConfig.findMany({
        where: {
          key: {
            in: [
              'PLANS_SHOW_FREE',
              'LANDING_PROMO_ENABLED',
              'LANDING_PROMO_CODE',
              'LANDING_PROMO_TEXT',
            ],
          },
        },
      }),
    ]);

    const map = new Map((configs || []).map((c) => [String(c.key || '').toUpperCase(), c.value ?? '']));
    const showFreeRaw = map.get('PLANS_SHOW_FREE');
    const promoEnabledRaw = map.get('LANDING_PROMO_ENABLED');
    const promoCodeRaw = map.get('LANDING_PROMO_CODE');
    const promoTextRaw = map.get('LANDING_PROMO_TEXT');

    showFree = showFreeRaw == null ? true : isTruthyValue(showFreeRaw);
    promo = {
      enabled: promoEnabledRaw == null ? false : isTruthyValue(promoEnabledRaw),
      code: String(promoCodeRaw || ''),
      text: String(promoTextRaw || ''),
    };

    products = plans
      .filter((plan) => plan.isActive)
      .map((plan) => ({
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: Number(plan.price),
        priceAnnual: plan.priceAnnual ? Number(plan.priceAnnual) : null,
        currency: plan.currency,
        interval: plan.interval,
        features: formatPlanFeatures(plan.features),
        isFreePlan:
          Boolean(plan?.features?.isFreePlan) ||
          String(plan?.slug || '').trim().toUpperCase() === 'FREE' ||
          Number(plan?.price || 0) === 0,
      }))
      .filter((p) => (showFree ? true : !p.isFreePlan))
      .sort((a, b) => a.price - b.price);
  } catch (e) {
    products = [];
  }

  if (!products?.length) {
    products = DEFAULT_PRODUCTS;
  }
  if (!showFree) {
    products = (products || []).filter(
      (p) =>
        !(
          String(p?.slug || '').trim().toUpperCase() === 'FREE' ||
          Number(p?.price || 0) === 0
        )
    );
  }

  return {
    props: {
      products,
      promo,
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
};

export default Home;
