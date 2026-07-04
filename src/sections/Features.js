import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";
import { 
  ChatBubbleBottomCenterTextIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  ArrowPathIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
  MegaphoneIcon,
  ArrowTrendingUpIcon,
  CursorArrowRaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
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
          
          {/* === NEW: META ADS NATIVE === */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-6 group relative bg-gradient-to-br from-[#0f0c29] via-[#1a1050] to-[#24243e] border border-indigo-500/20 rounded-[40px] shadow-2xl hover:border-indigo-400/40 transition-all duration-500 overflow-hidden flex flex-col md:flex-row"
          >
            {/* Background glow effects */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-600/10 blur-[100px] rounded-full translate-x-1/4 translate-y-1/4 pointer-events-none" />

            {/* Left: Content */}
            <div className="relative z-10 md:w-[45%] p-10 md:p-14 flex flex-col justify-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-indigo-500/10 border border-indigo-400/20 rounded-full w-fit">
                <MegaphoneIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 tracking-[0.2em] uppercase">Novo — Meta Ads Native</span>
              </div>

              <h3 className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-[0.9] mb-6">
                Gerencie seus Anúncios <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">sem sair do CRM.</span>
              </h3>

              <p className="text-zinc-400 text-base font-medium leading-relaxed mb-8 max-w-md">
                Conecte suas contas do Facebook e Instagram e veja o ROI real de cada campanha. Do anúncio à venda no WhatsApp, tudo rastreado em um único lugar.
              </p>

              {/* KPI Metrics Row */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Leads Gerados', value: '312', icon: <CursorArrowRaysIcon className="w-4 h-4" /> },
                  { label: 'CPL Médio', value: 'R$ 13', icon: <ChartBarIcon className="w-4 h-4" /> },
                  { label: 'ROAS', value: '4.2x', icon: <ArrowTrendingUpIcon className="w-4 h-4" /> },
                ].map((m) => (
                  <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-indigo-400 mb-2">{m.icon}</div>
                    <div className="text-2xl font-black text-white">{m.value}</div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2">
                {[
                  'Click-to-WhatsApp Ads com atribuição automática',
                  'Leads de formulários caindo direto no Pipeline',
                  'Dashboard de ROI por campanha e por criativo',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-300 text-sm font-medium">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* Channel Badges */}
              <div className="flex items-center gap-3 mt-8">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#1877f2]/10 border border-[#1877f2]/20 rounded-xl">
                  <svg className="w-4 h-4 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-[10px] font-black text-[#1877f2] uppercase tracking-wider">Facebook</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#e1306c]/10 border border-[#e1306c]/20 rounded-xl">
                  <svg className="w-4 h-4 text-[#e1306c]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span className="text-[10px] font-black text-[#e1306c] uppercase tracking-wider">Instagram</span>
                </div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">+ WhatsApp Nativo</span>
              </div>
            </div>

            {/* Right: Product Screenshot */}
            <div className="relative z-10 md:w-[55%] p-6 md:p-8 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg relative"
              >
                {/* Glow behind image */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-3xl" />
                <div className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] group-hover:shadow-[0_40px_80px_rgba(99,102,241,0.2)] transition-all duration-700">
                  <img
                    src="/images/showcase/ads-management.png"
                    alt="Meta Ads Manager Lite — Dashboard Vysify"
                    className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  {/* Overlay shimmer on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c29]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
                {/* Floating badge — LIVE */}
                <div className="absolute -top-3 -right-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 rounded-full shadow-lg border border-indigo-400/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Beta Disponível</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
          {/* === END: META ADS NATIVE === */}

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

          {/* Small Feature: Rotação de SMTPs */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-2 p-8 bg-white border border-zinc-100 rounded-[32px] shadow-xl hover:border-indigo-500/30 transition-all duration-500"
          >
             <div className="w-10 h-10 bg-[#eef2ff] rounded-xl flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
                <EnvelopeIcon className="w-5 h-5" />
             </div>
             <h4 className="text-base font-black text-zinc-900 uppercase tracking-tighter mb-2">Rotação de SMTPs</h4>
             <p className="text-zinc-500 text-sm font-medium">Conecte múltiplas caixas e rotacione os envios automaticamente para fugir do spam.</p>
          </motion.div>

          {/* Small Feature: Voz IA & Click-to-Call */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-2 p-8 bg-white border border-zinc-100 rounded-[32px] shadow-xl hover:border-indigo-500/30 transition-all duration-500"
          >
             <div className="w-10 h-10 bg-[#fdf2f8] rounded-xl flex items-center justify-center text-pink-600 mb-4 border border-pink-100">
                <PhoneIcon className="w-5 h-5" />
             </div>
             <h4 className="text-base font-black text-zinc-900 uppercase tracking-tighter mb-2">Voz IA & Click-to-Call</h4>
             <p className="text-zinc-500 text-sm font-medium">Chamadas automáticas com robôs realistas (Bland/Vapi) ou ligações manuais em 1 clique.</p>
          </motion.div>

          {/* Small Feature: SMS & Slack */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-2 p-8 bg-white border border-zinc-100 rounded-[32px] shadow-xl hover:border-indigo-500/30 transition-all duration-500"
          >
             <div className="w-10 h-10 bg-[#fef3c7] rounded-xl flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
             </div>
             <h4 className="text-base font-black text-zinc-900 uppercase tracking-tighter mb-2">SMS & Alertas Slack</h4>
             <p className="text-zinc-500 text-sm font-medium">Envie SMS em conformidade nos EUA (A2P 10DLC) e receba alertas rápidos no Slack do seu time.</p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

export default Features;
