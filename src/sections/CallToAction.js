import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const CallToAction = ({ hasFreePlan, acceptNewSubscriptions = true }) => {
  const { t } = useTranslation();

  return (
    <section className="w-full py-40 bg-zinc-50 relative overflow-hidden font-executive">
      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-zinc-900 rounded-[60px] p-12 md:p-24 overflow-hidden shadow-2xl shadow-indigo-100/20"
        >
          {/* Background Accents - Lilac/Violet */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-12">
              A revolução do <br />
              <span className="text-indigo-400">Seu Comercial</span> começa agora.
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {acceptNewSubscriptions && (
                <Link href="/auth/register">
                  <button className="px-12 py-6 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:scale-105">
                    {hasFreePlan ? t('landing.cta.buttonFree', 'Criar Conta Grátis') : t('landing.cta.buttonPaidOnly', 'Criar Conta')}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CallToAction;
