import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { 
  Hero, 
  Features, 
  Pricing, 
  Testimonial, 
  FAQ, 
  CallToAction, 
  Footer,
  Stats,
  AppShowcase
} from '@/sections';
import Meta from '@/components/Meta';
import { getAllPlans } from '@/prisma/services/plan';
import prisma from '@/prisma/index';

export default function Home({ plans, promo, hasFreePlan }) {
  return (
    <div className="min-h-screen bg-white">
      <Meta 
        title="Vysify CRM | O Futuro do Comércio Digital e WhatsApp" 
        description="Centralize seus leads, automatize seu WhatsApp e domine seu pipeline com o CRM mais completo para equipes de alta performance."
      />
      
      <main>
        <Hero hasFreePlan={hasFreePlan} />
        <Stats />
        <Features />
        <AppShowcase />
        <Testimonial />
        <Pricing products={plans} promo={promo} />
        <FAQ />
        <CallToAction hasFreePlan={hasFreePlan} />
      </main>

      <Footer />
    </div>
  );
}

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: '/account',
        permanent: false,
      },
    };
  }

  // Fetch plans for the pricing section
  const plansData = await getAllPlans();
  const plans = JSON.parse(JSON.stringify(plansData));

  // Determine if there's a free plan
  const activePlans = (plans || []).filter((p) => Boolean(p.isActive));
  const hasFreePlan = activePlans.some((p) => (
    Boolean(p.features?.isFreePlan) ||
    String(p.slug || '').trim().toUpperCase() === 'FREE' ||
    Number(p.price || 0) === 0
  ));

  // Fetch landing page promo settings
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['LANDING_PROMO_ENABLED', 'LANDING_PROMO_TEXT', 'LANDING_PROMO_CODE']
      }
    }
  });

  const promo = {
    enabled: settings.find(s => s.key === 'LANDING_PROMO_ENABLED')?.value === 'true',
    text: settings.find(s => s.key === 'LANDING_PROMO_TEXT')?.value || '',
    code: settings.find(s => s.key === 'LANDING_PROMO_CODE')?.value || ''
  };

  return {
    props: {
      plans: activePlans,
      promo,
      hasFreePlan
    },
  };
};

