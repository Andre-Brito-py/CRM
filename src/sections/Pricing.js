import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTranslation } from "react-i18next";

const parseFeatures = (featuresData) => {
  try {
    if (!featuresData) return [];
    if (Array.isArray(featuresData)) return featuresData;
    if (typeof featuresData === 'string') return JSON.parse(featuresData);
    if (typeof featuresData === 'object') {
      return Object.entries(featuresData).map(([key, value]) => `${key}: ${value}`);
    }
    return [];
  } catch (e) {
    console.error('Error parsing features:', e);
    return [];
  }
};

const getCurrencyFormatter = (currency) => {
  const normalizedCurrency = currency || 'BRL';
  const locale = normalizedCurrency === 'BRL' ? 'pt-BR' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  });
};

const Pricing = ({ products }) => {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div id="pricing" className="w-full py-32 bg-[#050505] relative overflow-hidden border-t border-zinc-900">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px]" />

      <div className="relative flex flex-col items-center max-w-7xl px-6 mx-auto lg:px-8 space-y-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-3xl"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            {t("landing.pricing.title", "Plans that scale with your ambitions.")}
          </h2>
          <p className="mt-6 text-xl text-zinc-400 leading-relaxed">
            {t("landing.pricing.subtitle", "Start free, upgrade when you need more power. Transparent pricing for high-performance teams.")}
          </p>
          
          <div className="mt-10 flex items-center justify-center p-1.5 bg-zinc-900/60 rounded-full border border-zinc-800">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                !isAnnual ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t("landing.pricing.monthly", "Mensal")}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                isAnnual ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t("landing.pricing.annually", "Anual")}
              {products?.some(p => p.annualDiscount > 0) && (
                <span className="text-[10px] sm:text-xs uppercase tracking-wider bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                  {t("landing.pricing.saveUpTo", "Economize")} {Math.max(...products.map(p => p.annualDiscount || 0))}%
                </span>
              )}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {products?.length > 0 ? (
            products.map((product, index) => {
              const slug = String(product?.slug || '').trim().toUpperCase();
              const isMostPopular = slug ? slug === 'STANDARD' : index === 1;
              const featuresList = parseFeatures(product.features);
              const currencyFormatter = getCurrencyFormatter(product.currency);
              const isFree = Number(product.price) === 0;
              const hasAnnualPrice = product.priceAnnual != null && product.priceAnnual > 0;
              const displayPrice = isAnnual && hasAnnualPrice ? Number(product.priceAnnual) / 12 : Number(product.price);
              const intervalParam = isAnnual && hasAnnualPrice ? 'year' : 'month';
              const intervalLabel = t('landing.pricing.month', '/mês');

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  whileHover={{ y: -8 }}
                  className={`flex flex-col relative overflow-hidden rounded-3xl ${isMostPopular
                    ? 'bg-zinc-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 md:-mt-8 md:mb-8'
                    : 'bg-[#0a0a0b] border border-zinc-800'
                    }`}
                >
                  {isMostPopular && (
                    <div className="absolute top-0 left-0 w-full bg-indigo-600 py-1.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      {t("landing.pricing.popular", "Mais Popular")}
                    </div>
                  )}

                  <div className={`p-10 ${isMostPopular ? 'pt-12' : ''} space-y-6 flex-1`}>
                    <h3 className="text-2xl font-bold text-white">{t(`landing.pricing.plan.${product.name}.name`, product.name)}</h3>
                    <p className="text-zinc-400 min-h-[48px]">{t(`landing.pricing.plan.${product.name}.desc`, product.description)}</p>

                    <div className="flex flex-col my-8">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-5xl font-extrabold text-white">
                          {isFree ? t('landing.pricing.free', 'Grátis') : currencyFormatter.format(displayPrice)}
                        </span>
                        {!isFree && <span className="text-zinc-500 font-medium">{intervalLabel}</span>}
                      </div>
                      {!isFree && isAnnual && hasAnnualPrice && (
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-sm text-green-400 font-medium">Cobrado {currencyFormatter.format(product.priceAnnual)} por ano</p>
                          {product.annualDiscount > 0 && (
                            <p className="text-xs text-green-500/80 font-bold uppercase tracking-tight">Economia de {product.annualDiscount}% no plano anual</p>
                          )}
                        </div>
                      )}
                      {!isFree && !isAnnual && hasAnnualPrice && (
                        <p className="text-sm text-zinc-500 mt-2 opacity-0">Placeholder</p> // Maintain height
                      )}
                    </div>

                    <Link
                      href={{
                        pathname: '/auth/register',
                        query: product?.slug ? { plan: product.slug, interval: intervalParam } : undefined,
                      }}
                      className={`flex items-center justify-center w-full px-6 py-4 text-base font-bold rounded-xl transition-all ${isMostPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                        }`}
                    >
                      {t("landing.pricing.getStarted", "Começar Agora")}
                    </Link>

                    <div className="pt-8 mt-8 border-t border-zinc-800">
                      <p className="text-sm font-medium text-white mb-6 uppercase tracking-wider">{t("landing.pricing.included", "What's included")}</p>
                      <ul className="space-y-4">
                        {featuresList.length > 0 ? (
                          featuresList.map((featureItem, i) => {
                            const featureKey = `landing.pricing.feature.${featureItem.replace(/[^a-zA-Z0-9]/g, '')}`;
                            return (
                              <li key={i} className="flex items-start">
                                <CheckIcon className={`w-5 h-5 mr-3 shrink-0 ${isMostPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                <span className="text-zinc-300">{t(featureKey, featureItem)}</span>
                              </li>
                            );
                          })
                        ) : (
                          <li className="flex items-start">
                            <CheckIcon className={`w-5 h-5 mr-3 shrink-0 ${isMostPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            <span className="text-zinc-300">Full CRM Access</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="w-full col-span-3 text-center py-20">
              <p className="text-zinc-500 text-xl">{t("landing.pricing.empty", "Pricing plans are currently being updated.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
