import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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
} from '@/sections/index';
import Meta from '@/components/Meta';
import { getAllPlans } from '@/prisma/services/plan';
import prisma from '@/prisma/index';

export default function Home({ plans, promo, hasFreePlan }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/account');
    }
  }, [status, router]);

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Meta 
        title="Vysify | Sistema Operacional Comercial para WhatsApp" 
        description="Sistema operacional comercial para empresas que vendem pelo WhatsApp. Centralize seus contatos, automatize processos e domine suas vendas."
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

export const getStaticProps = async () => {
  try {
    // Fetch plans for the pricing section
    let plansData = [];
    try {
      plansData = await getAllPlans();
    } catch (e) {
      console.error('Error fetching plans:', e);
    }
    
    const plans = JSON.parse(JSON.stringify(plansData || []));

    // Fetch landing page promo settings and plan visibility settings
    let settings = [];
    try {
      settings = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: ['LANDING_PROMO_ENABLED', 'LANDING_PROMO_TEXT', 'LANDING_PROMO_CODE', 'PLANS_SHOW_FREE']
          }
        }
      });
    } catch (e) {
      console.error('Error fetching system settings:', e);
    }

    const promo = {
      enabled: settings.find(s => s.key === 'LANDING_PROMO_ENABLED')?.value === 'true',
      text: settings.find(s => s.key === 'LANDING_PROMO_TEXT')?.value || '',
      code: settings.find(s => s.key === 'LANDING_PROMO_CODE')?.value || ''
    };

    const plansShowFree = settings.find(s => s.key === 'PLANS_SHOW_FREE')?.value !== 'false';

    // Determine if there's a free plan and filter visible plans
    const activePlans = (plans || []).filter((p) => {
      const isActive = Boolean(p.isActive);
      const isVisible = p.features?.isVisible !== false;
      const isFreePlan = (
        Boolean(p.features?.isFreePlan) ||
        String(p.slug || '').trim().toUpperCase() === 'FREE' ||
        Number(p.price || 0) === 0
      );

      if (!isActive || !isVisible) return false;
      if (isFreePlan && !plansShowFree) return false;

      return true;
    });

    const hasFreePlan = activePlans.some((p) => {
      return (
        Boolean(p.features?.isFreePlan) ||
        String(p.slug || '').trim().toUpperCase() === 'FREE' ||
        Number(p.price || 0) === 0
      );
    });

    return {
      props: {
        plans: activePlans,
        promo,
        hasFreePlan
      },
      revalidate: 3600, // Revalidate every hour to keep CPU usage low
    };
  } catch (error) {
    console.error('Index page static generation failed:', error);
    return {
      props: {
        plans: [],
        promo: { enabled: false, text: '', code: '' },
        hasFreePlan: true
      },
      revalidate: 60,
    };
  }
};
