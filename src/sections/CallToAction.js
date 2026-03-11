import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

const CallToAction = () => {
  const { t } = useTranslation();
  return (
    <div className="relative flex items-center justify-center w-full py-32 bg-[#050505] overflow-hidden border-t border-zinc-900">
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[25%] w-[50%] h-[80%] bg-indigo-600/20 rounded-full blur-[150px]" 
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 mx-auto text-center max-w-4xl space-y-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col space-y-6"
        >
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
            {t('landing.cta.title', "Ready to transform your sales process?")}
          </h2>
          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {t('landing.cta.subtitle', "Join thousands of high-growth teams already using the platform to close deals faster.")}
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center w-full sm:w-auto"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link 
              href="/auth/register"
              className="group relative flex items-center justify-center px-10 py-5 text-xl font-bold text-white bg-indigo-600 rounded-2xl shadow-2xl hover:bg-indigo-500 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative flex items-center">
                {t('landing.cta.button', "Start your free 14-day trial")}
                <ChevronRightIcon className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CallToAction;
