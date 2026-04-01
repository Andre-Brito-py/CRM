import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { CheckIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, getDefaultCurrencyForLang } from '@/lib/common/currency';

const Pricing = ({ products, promo }) => {
  const { t, i18n } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(true);
  const [clientCurrency, setClientCurrency] = useState(null);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('America/Sao_Paulo') || tz.includes('America/Fortaleza') || tz.includes('America/Rio_Branco') || tz.includes('America/Manaus') || tz.includes('America/Campo_Grande') || tz.includes('America/Maceio') || tz.includes('America/Cuiaba') || tz.includes('America/Porto_Velho') || tz.includes('America/Boa_Vista') || tz.includes('America/Eirunepe') || tz.includes('America/Araguaina') || tz.includes('America/Bahia') || tz.includes('America/Recife') || tz.includes('America/Belem')) {
        setClientCurrency('BRL');
      } else if (tz.includes('Europe/London') || tz.includes('Europe/Belfast')) {
        setClientCurrency('GBP');
      } else if (tz.includes('Europe/')) {
        setClientCurrency('EUR');
      }
    } catch(e) {}
  }, []);

  const formattedProducts = useMemo(() => {
    const targetCurrency = clientCurrency || getDefaultCurrencyForLang(i18n.language);

    return (products || []).map(plan => {
      // Find the best price for this plan
      let selectedPrice = null;
      if (plan.currency !== targetCurrency && plan.prices && plan.prices.length > 0) {
        selectedPrice = plan.prices.find(p => p.currency === targetCurrency) ||
                        plan.prices.find(p => p.currency === 'USD') ||
                        plan.prices[0];
      }

      const basePrice = selectedPrice ? (selectedPrice.amount || 0) : Number(plan.price || 0);
      const basePriceAnnual = selectedPrice ? (selectedPrice.amountAnnual || 0) : Number(plan.priceAnnual || 0);
      const baseCurrency = selectedPrice ? selectedPrice.currency : (plan.currency || 'USD');

      const monthlyPrice = isAnnual 
        ? (basePriceAnnual ? (basePriceAnnual / 12) : basePrice * 0.8)
        : basePrice;
        
  const getPlanFeatures = (plan) => {
    const f = plan.features || {};
    const modules = f.allowedModules || {};
    const items = [];

    // Numerical Limits
    if (f.maxUsers) items.push(`Até ${f.maxUsers} ${f.maxUsers === 1 ? 'Usuário' : 'Usuários'}`);
    if (f.maxContacts) items.push(`${f.maxContacts.toLocaleString()} Contatos`);
    
    // Key Modules (Mapping keys to labels)
    const moduleLabels = {
      inbox: "Atendimento WhatsApp",
      pipeline: "Pipeline (Kanban)",
      automations: "Automações de Fluxo",
      ai_assistant: "Assistente de IA",
      payments: "Pagamentos e Cobranças",
      analytics: "Relatórios Avançados",
      nps: "Pesquisas de NPS",
      integrations: "API e Webhooks"
    };

    Object.keys(moduleLabels).forEach(key => {
      if (modules[key] !== false) {
        items.push(moduleLabels[key]);
      }
    });

    if (f.freeTrialDays > 0) items.push(`${f.freeTrialDays} Dias de Teste Grátis`);

    return items;
  };

  return {
    ...plan,
    isPopular: Boolean(f.isHighlighted),
    featuresList: getPlanFeatures(plan),
    selectedPriceId: isAnnual ? selectedPrice?.stripePriceIdAnnual : selectedPrice?.stripePriceId,
    displayPrice: formatCurrency(monthlyPrice, baseCurrency, i18n.language)
  };
});
}, [products, isAnnual, i18n.language, clientCurrency]);

return (
<section id="pricing" className="w-full py-40 bg-white relative overflow-hidden font-executive border-t border-zinc-100">
  {/* Visual Vitality - Background Glows */}
  <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2" />
  <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 blur-[100px] rounded-full translate-y-1/2" />
  <div className="max-w-7xl mx-auto px-8 relative z-10">
    <div className="text-center mb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center px-4 py-2 mb-6 text-[10px] font-black text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 tracking-[0.2em] uppercase">
          Pricing Architecture
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase mb-8">
          Planos <br />
          <span className="text-zinc-400">Escaláveis.</span>
        </h2>
        {promo?.enabled && (String(promo?.code || '').trim() || String(promo?.text || '').trim()) && (
          <div className="flex justify-center mt-10">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
              {String(promo?.code || '').trim() && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Código {String(promo.code).trim()}</span>
              )}
              {String(promo?.text || '').trim() && (
                <span className="text-xs font-semibold tracking-tight text-indigo-700">{String(promo.text).trim()}</span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>

    {/* Billing Toggle - Enhanced Visibility */}
    <div className="flex flex-col items-center mb-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center gap-8 bg-zinc-100/50 p-2 rounded-[24px] border border-zinc-200"
      >
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isAnnual ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Faturamento Mensal
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${isAnnual ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Anual
          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${isAnnual ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>-20%</span>
        </button>
      </motion.div>
    </div>

    {/* Pricing Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      {formattedProducts?.map((plan, index) => (
        <motion.div
          key={plan.id || index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={`relative p-12 bg-white rounded-[40px] border ${plan.isPopular ? 'border-indigo-500 shadow-2xl scale-105 z-10' : 'border-zinc-100 shadow-xl'} transition-all`}
        >
          {plan.isPopular && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              Mais Popular
            </div>
          )}

          <div className="mb-10">
            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-widest mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-zinc-900 tracking-tighter">{plan.displayPrice}</span>
              <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">/ mês</span>
            </div>
          </div>

          <ul className="space-y-6 mb-12">
            {(plan.featuresList || []).slice(0, 10).map((feature, i) => (
              <li key={i} className="flex items-start gap-4 text-sm font-medium text-zinc-500">
                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <Link 
            href={`/auth/register?plan=${plan.slug}&interval=${isAnnual ? 'year' : 'month'}${plan.selectedPriceId ? `&priceId=${plan.selectedPriceId}` : ''}`}
            className={`w-full block text-center py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${plan.isPopular ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700' : 'bg-zinc-50 text-zinc-900 border border-zinc-100 hover:bg-zinc-100'}`}
          >
            {plan?.isFreePlan ? 'Começar grátis' : 'Escolher Plano'}
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
</section>
  );
};

export default Pricing;
