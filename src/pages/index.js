import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import {
  CallToAction,
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
        title="NextJS SaaS Boilerplate"
        description="A boilerplate for your NextJS SaaS projects."
      />
      <Hero />
      <Features />
      <Pricing products={products} />
      <Guides />
      <Testimonial />
      <CallToAction />
      <Footer />
    </LandingLayout>
  );
};

export const getStaticProps = async () => {
  const plans = await getAllPlans();
  const products = plans.map((plan) => ({
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    currency: plan.currency,
    interval: plan.interval,
  }));

  return {
    props: {
      products,
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
};

export default Home;
