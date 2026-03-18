import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";
import { 
  ChatBubbleBottomCenterTextIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  ArrowPathIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const Features = () => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <section id="features" className="w-full py-20 bg-white relative overflow-hidden font-executive border-t border-zinc-100">
      {/* Visual Vitality - Background Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/[0.04] blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/[0.04] blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
      <div className="max-w-[1400px] mx-auto px-8 relative z-10">
        
        {/* Header Section - Consolidated */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-l-4 border-indigo-500 pl-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <div className="text-[10px] font-black text-indigo-600 tracking-[0.2em] uppercase mb-4">
               High-Performance Architecture
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tighter uppercase leading-[0.9]">
               Sua Operação <br />
               <span className="text-zinc-400">em Outro Nível.</span>
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-md text-base text-zinc-500 font-medium leading-relaxed"
          >
             Tecnologia de ponta para simplificar operações complexas. Cada milissegundo conta na jornada do seu cliente.
          </motion.p>
        </div>

        {/* Bento Grid - Tightened */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-6 gap-6"
        >
          
          {/* Main Feature: WhatsApp Automation */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-3 group relative p-10 bg-white border border-zinc-100 rounded-[40px] shadow-2xl hover:border-indigo-500/30 transition-all duration-500 overflow-hidden flex flex-col min-h-[400px]"
          >
             <div className="relative z-10">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100">
                   <ChatBubbleBottomCenterTextIcon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-4">Automação de WhatsApp</h3>
                <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-sm">
                   Crie fluxos de conversa sofisticados, dispare orçamentos automáticos e gerencie leads em tempo real.
                </p>
             </div>
             
             {/* Visual Overlay Thumbnail */}
             <div className="mt-8 relative h-32 rounded-3xl overflow-hidden border border-zinc-100 shadow-lg group-hover:scale-105 transition-transform duration-700">
                <img src="/images/showcase/inbox.png" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Inbox Preview" />
             </div>
          </motion.div>

          {/* Team Efficiency */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-3 group relative p-10 bg-white border border-zinc-100 rounded-[40px] shadow-2xl hover:border-indigo-500/30 transition-all duration-500 overflow-hidden flex flex-col min-h-[400px]"
          >
             <div className="relative z-10">
                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-6 border border-violet-100">
                   <UserGroupIcon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-4">Orquestração de Equipe</h3>
                <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-sm">
                   Distribua leads por carga, região ou especialidade. Gestão humanizada e escalável.
                </p>
             </div>
             <div className="mt-8 relative h-48 rounded-3xl overflow-hidden border border-zinc-100 shadow-lg group-hover:scale-105 transition-transform duration-700">
                <img src="/images/showcase/pipeline.png" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Pipeline Preview" />
             </div>
          </motion.div>

          {/* Small Feature: Power Analytics */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-2 p-8 bg-white border border-zinc-100 rounded-[32px] shadow-xl hover:border-indigo-500/30 transition-all duration-500"
          >
             <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-900 mb-4 border border-zinc-100">
                <ChartBarIcon className="w-5 h-5" />
             </div>
             <h4 className="text-base font-black text-zinc-900 uppercase tracking-tighter mb-2">Power Analytics</h4>
             <p className="text-zinc-500 text-sm font-medium">Métricas acionáveis sob seu comando.</p>
          </motion.div>

          {/* Small Feature: No-Code Hub */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-2 p-8 bg-white border border-zinc-100 rounded-[32px] shadow-xl hover:border-indigo-500/30 transition-all duration-500"
          >
             <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-900 mb-4 border border-zinc-100">
                <ArrowPathIcon className="w-5 h-5" />
             </div>
             <h4 className="text-base font-black text-zinc-900 uppercase tracking-tighter mb-2">No-Code Hub</h4>
             <p className="text-zinc-500 text-sm font-medium">Pipelines adaptáveis ao seu negócio.</p>
          </motion.div>

          {/* Small Feature: Security */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-2 p-8 bg-white border border-zinc-100 rounded-[32px] shadow-xl hover:border-indigo-500/30 transition-all duration-500"
          >
             <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-900 mb-4 border border-zinc-100">
                <ShieldCheckIcon className="w-5 h-5" />
             </div>
             <h4 className="text-base font-black text-zinc-900 uppercase tracking-tighter mb-2">Enterprise Ready</h4>
             <p className="text-zinc-500 text-sm font-medium">Arquitetura bancária com ISO 27001.</p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

export default Features;
