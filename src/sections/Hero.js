import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Logo from '@/components/Logo';
import MouseParticles from '@/components/Animations/MouseParticles';

const Hero = () => {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  
  const y1 = useTransform(scrollY, [0, 800], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300, 800], [1, 1, 0]);

  return (
    <section className="relative min-h-screen flex flex-col items-center bg-white overflow-hidden font-executive max-w-[100vw]">
      {/* Visual Vitality - Background Glows */}
      <div className="absolute top-0 left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Absolute Header (Not Following Scroll) */}
      <header className="absolute top-10 left-0 w-full z-50 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
           <Logo variant="full" className="h-6" />
           <div className="hidden md:flex items-center gap-10">
              <a href="#features" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-brand-500 transition-colors">Tecnologia</a>
              <a href="#pricing" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-brand-500 transition-colors">Planos</a>
              <Link href="/demo" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-brand-500 transition-colors">Solicitar Demo</Link>
           </div>
           <Link 
             href={session ? "/account" : "/auth/login"}
             className="px-8 py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-zinc-200"
           >
             {session ? "Acessar Painel" : "Login"}
           </Link>
        </div>
      </header>

      {/* Dynamic Background Particles */}
      <MouseParticles color="rgba(129, 140, 248, 0.6)" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-8 w-full flex flex-col items-center text-center pt-52">
        
        {/* Main Hero Content - More Compact */}
        <motion.div 
          style={{ y: y1, opacity }}
          className="flex flex-col items-center max-w-4xl mb-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-4 py-2 mb-8 text-[9px] font-black text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 tracking-[0.2em] uppercase"
          >
            Engineering the Future of Sales
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-6xl md:text-8xl font-black text-zinc-900 tracking-tighter uppercase leading-[0.85] mb-8"
          >
            A nova era do <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Comércio Digital.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-zinc-500 font-medium tracking-tight max-w-2xl leading-relaxed mb-12"
          >
            Sincronize sua equipe, automatize seu WhatsApp e domine seu pipeline com a arquitetura CRM mais avançada do mercado.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link 
              href="/auth/register"
              className="px-12 py-5 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Criar Conta Grátis
            </Link>
            <Link 
              href="/demo"
              className="px-12 py-5 bg-white text-zinc-900 border border-zinc-200 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-sm hover:bg-zinc-50 transition-all"
            >
              Ver demonstração
            </Link>
          </motion.div>
        </motion.div>

        {/* Real Product Showcase - Dense & High End */}
        <motion.div
           initial={{ opacity: 0, y: 60 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.8 }}
           className="relative w-full max-w-7xl"
        >
           <div className="grid grid-cols-12 gap-6 items-end">
              {/* Inbox Preview */}
              <div className="col-span-12 md:col-span-4 translate-y-20">
                 <div className="bg-white p-3 rounded-[32px] shadow-2xl border border-zinc-100 rotate-1 hover:rotate-0 transition-transform duration-700">
                    <Image 
                       src="/images/showcase/inbox.png" 
                       alt="Inbox Omnichannel" 
                       width={800} height={600}
                       className="w-full rounded-[20px] shadow-inner"
                    />
                    <div className="mt-4 px-4 pb-2">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Inbox Elite</p>
                       <p className="text-xs font-bold text-zinc-900">Gestão Multicanal Unificada</p>
                    </div>
                 </div>
              </div>

              {/* Main Pipeline Showcase */}
              <div className="col-span-12 md:col-span-8">
                 <div className="bg-white p-4 rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] border border-zinc-100 relative z-10 group overflow-hidden">
                    <Image 
                       src="/images/showcase/pipeline.png" 
                       alt="Pipeline CRM" 
                       width={1200} height={800}
                       className="w-full rounded-[28px] transition-transform duration-1000 group-hover:scale-105"
                    />
                    {/* Floating Info Overlay */}
                    <div className="absolute bottom-10 left-10 p-6 bg-white/90 backdrop-blur-2xl rounded-3xl border border-white shadow-2xl max-w-xs text-left">
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Power Pipeline</p>
                       <p className="text-sm font-bold text-zinc-900 italic">&quot;Simplificamos o caos comercial em fluxos visuais de alta performance.&quot;</p>
                    </div>
                 </div>
              </div>

              {/* Custom Fields Preview */}
              <div className="hidden md:block absolute -right-4 lg:-right-10 top-20 w-80">
                 <div className="bg-white p-4 rounded-[32px] shadow-2xl border border-zinc-100 -rotate-3 hover:rotate-0 transition-transform duration-700 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Image 
                       src="/images/showcase/custom-fields.png" 
                       width={400} height={600}
                       className="w-full h-auto rounded-2xl grayscale hover:grayscale-0 transition-all duration-700"
                       alt="Custom Fields"
                    />
                    <div className="mt-4 px-2">
                       <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Custom Architecture</p>
                       <p className="text-[11px] font-medium text-zinc-400 mt-1">Configure o CRM para seu negócio</p>
                    </div>
                 </div>
              </div>

              {/* Analytics Floating View - Authentic Product Data */}
              <div className="hidden lg:block absolute -left-32 bottom-20 w-72 z-40">
                 <motion.div 
                   initial={{ x: -20, opacity: 0 }}
                   whileInView={{ x: 0, opacity: 1 }}
                   className="bg-white p-3 rounded-[28px] shadow-2xl border border-zinc-100 rotate-6 hover:rotate-0 transition-all duration-700 group relative"
                 >
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-12 group-hover:rotate-0 transition-transform z-10">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <Image 
                       src="/images/showcase/analytics.png" 
                       width={400} height={300}
                       className="w-full h-auto rounded-xl grayscale hover:grayscale-0 transition-all duration-700 shadow-sm"
                       alt="Analytics Preview"
                    />
                    <div className="mt-3 px-1">
                       <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Real-time Control</p>
                    </div>
                 </motion.div>
              </div>
           </div>
        </motion.div>

      </div>
      
      {/* Spacer for the overlaps */}
      <div className="h-40" />
    </section>
  );
};

export default Hero;
