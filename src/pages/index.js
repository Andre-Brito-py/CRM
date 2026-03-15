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
  Testimonial,
} from '@/sections/index';
import { getAllPlans } from '@/prisma/services/plan';

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

const Home = ({ products }) => {
  return (
    <LandingLayout>
      <Meta
        title="Closify CRM - Omnichannel Sales & Customer Management"
        description="The ultimate CRM platform to manage your leads, sales pipelines, and WhatsApp conversations in one place."
      />
      <Hero />
      <Features />
      <Pricing products={products} />
      <Testimonial />
      <FAQ />
      <CallToAction />
      <Footer />
    </LandingLayout>
  );
};

export const getStaticProps = async () => {
  let products = [];
  try {
    const plans = await getAllPlans();
    products = plans
      .filter((plan) => plan.isActive)
      .map((plan) => ({
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: Number(plan.price),
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
      }))
      .sort((a, b) => a.price - b.price);
  } catch (e) {
    products = [];
  }

  if (!products?.length) {
    products = DEFAULT_PRODUCTS;
  }

  return {
    props: {
      products,
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
};

export default Home;
