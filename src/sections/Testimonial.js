import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";

const Testimonial = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full py-32 bg-[#0a0a0b] relative overflow-hidden">
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
      
      <div className="relative flex flex-col items-center px-6 mx-auto sm:px-8 max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative px-8 py-16 md:px-16 md:py-20 bg-zinc-900/40 border border-white/5 rounded-[3rem] backdrop-blur-sm overflow-hidden text-center"
        >
          <div className="absolute -top-6 -left-6 text-9xl text-indigo-500/20 font-serif leading-none">&ldquo;</div>
          
          <h3 className="relative z-10 text-2xl md:text-4xl font-medium leading-relaxed text-white tracking-tight">
            <span>&ldquo;</span>
            {t('landing.testimonial.quote', "Since moving our team to Nextacular CRM, our response times dropped by 80% and we closed 3x more enterprise deals in the first month. It’s the ultimate sales machine.")}
            <span>&rdquo;</span>
          </h3>
          
          <div className="relative z-10 flex flex-col items-center justify-center mt-12 space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-2 shadow-lg shadow-indigo-500/30 border-2 border-[#0a0a0b]" />
            <h4 className="text-xl font-bold text-white tracking-tight">
              {t('landing.testimonial.author', "Sarah Jenkins")}
            </h4>
            <span className="text-indigo-400 font-medium">
              {t('landing.testimonial.role', "VP of Sales")}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Testimonial;
