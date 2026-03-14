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

  return {
    props: {
      products,
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
};

export default Home;
