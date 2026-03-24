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
          
          {/* Main Feature: AI Autopilot */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-6 group relative p-10 md:p-14 bg-zinc-950 text-white border border-zinc-800 rounded-[40px] shadow-2xl hover:border-emerald-500/50 transition-all duration-500 overflow-hidden flex flex-col md:flex-row items-center gap-12"
          >
             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
             <div className="relative z-10 md:w-1/2">
                <div className="text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                   <BoltIcon className="w-4 h-4" /> Inteligência Artificial
                </div>
                <h3 className="text-4xl lg:text-6xl font-black uppercase tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                   Vysify Autopilot
                </h3>
                <p className="text-zinc-400 text-lg font-medium leading-relaxed max-w-lg mb-8">
                   Esqueça os chatbots frustrantes. Nossa I.A. consome os dados do seu negócio e atende seus clientes no WhatsApp com <span className="text-emerald-400 font-bold">persuasão e naturalidade</span>. Qualificação, vendas e suporte trabalhando 24h por dia no piloto automático.
                </p>
                <div className="flex gap-6 mb-8 md:mb-0">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-300 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     Responde em 2s
                  </div>
                </div>
             </div>
             <div className="relative z-10 md:w-1/2 w-full h-[400px]">
                {/* Simulated WhatsApp Dark Mode Interface */}
                <div className="absolute inset-0 rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl bg-[#0b141a] flex flex-col">
                  {/* Chat Header */}
                  <div className="bg-[#202c33] px-6 py-4 flex items-center justify-between border-b border-zinc-800/50 z-20 shadow-sm relative">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-inner">
                        <BoltIcon className="w-5 h-5 text-emerald-50" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-100 text-base leading-tight">Vysify I.A.</div>
                        <div className="text-emerald-400 text-xs font-semibold">online</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Body (Scrollable area simulation) */}
                  <div className="flex-1 p-6 flex flex-col justify-end gap-4 bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-blend-soft-light bg-black/40 relative z-10">
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0b141a] via-[#0b141a]/90 to-transparent" />
                     
                     <div className="relative z-20 flex flex-col gap-4 w-full">
                       {/* Message 1: Client */}
                       <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: -20 }}
                          whileInView={{ opacity: 1, scale: 1, x: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                          className="flex items-end gap-2 w-[85%]"
                       >
                         <div className="bg-[#202c33] rounded-2xl rounded-tl-sm p-3 px-4 shadow-sm relative">
                           <p className="text-zinc-100 text-[13px] leading-relaxed">Olá! Vi o anúncio de vocês. O CRM funciona para agências de marketing?</p>
                           <span className="text-[10px] text-zinc-500 absolute bottom-1.5 right-3">14:02</span>
                         </div>
                       </motion.div>
                       
                       {/* Message 2: Autopilot */}
                       <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: 20 }}
                          whileInView={{ opacity: 1, scale: 1, x: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ delay: 1.5, type: "spring", stiffness: 200, damping: 20 }}
                          className="flex items-end gap-2 self-end w-[85%] justify-end"
                       >
                         <div className="bg-[#005c4b] rounded-2xl rounded-tr-sm p-3 px-4 shadow-sm relative text-zinc-100">
                           <p className="text-[13px] leading-relaxed mb-3">Olá! Sim, funciona perfeitamente para agências! ✨</p>
                           <p className="text-[13px] leading-relaxed">Inclusive, você pode conectar várias contas de WhatsApp dos seus clientes em um único painel e acompanhar as conversas em tempo real usando nossa visão Kanban.</p>
                           <div className="flex justify-end items-center gap-1 mt-1">
                             <span className="text-[10px] text-emerald-200/70">14:02</span>
                             <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path></svg>
                           </div>
                         </div>
                       </motion.div>

                       {/* Message 3: Client */}
                       <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: -20 }}
                          whileInView={{ opacity: 1, scale: 1, x: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ delay: 3.2, type: "spring", stiffness: 200, damping: 20 }}
                          className="flex items-end gap-2 w-[85%]"
                       >
                         <div className="bg-[#202c33] rounded-2xl rounded-tl-sm p-3 px-4 shadow-sm relative">
                           <p className="text-zinc-100 text-[13px] leading-relaxed">Que incrível! E qual o valor?</p>
                           <span className="text-[10px] text-zinc-500 absolute bottom-1.5 right-3">14:03</span>
                         </div>
                       </motion.div>

                       {/* Message 4: Autopilot (Typing indicator simulation) */}
                       <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: 20 }}
                          whileInView={{ opacity: 1, scale: 1, x: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ delay: 4.5, type: "spring", stiffness: 200, damping: 20 }}
                          className="flex items-end gap-2 self-end justify-end mt-1"
                       >
                         <div className="bg-[#005c4b] rounded-2xl rounded-tr-sm p-3 px-4 shadow-sm text-zinc-100 flex items-center gap-1">
                            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1.5 h-1.5 bg-emerald-200 rounded-full block"></motion.span>
                            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-200 rounded-full block"></motion.span>
                            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-200 rounded-full block"></motion.span>
                         </div>
                       </motion.div>
                     </div>
                  </div>
                </div>
             </div>
          </motion.div>
          
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
