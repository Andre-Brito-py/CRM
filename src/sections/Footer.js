import Link from 'next/link';
import Logo from '@/components/Logo';

const Footer = () => {
  return (
    <footer className="w-full py-24 bg-white border-t border-zinc-100 font-executive">
      <div className="max-w-[1400px] mx-auto px-8 grid grid-cols-1 md:grid-cols-12 gap-16">
        
        {/* Brand & Mission */}
        <div className="md:col-span-5 flex flex-col items-start gap-8">
          <Logo variant="full" className="h-6" />
          <p className="text-zinc-500 text-lg font-medium leading-relaxed max-w-sm">
            Elevando o padrão da gestão comercial global com tecnologia de ponta e design focado em resultados.
          </p>
          <div className="flex gap-4">
             {[1,2,3].map(i => (
                <div key={i} className="w-10 h-10 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-brand-500 transition-colors cursor-pointer">
                   <div className="w-5 h-5 bg-current rounded-sm opacity-20" />
                </div>
             ))}
          </div>
        </div>

        {/* Links Grid */}
        <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Plataforma</h4>
            <div className="flex flex-col gap-4">
              <Link href="#features" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Funcionalidades</Link>
              <Link href="#pricing" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Planos</Link>
              <Link href="/demo" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Demonstração</Link>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Recursos</h4>
            <div className="flex flex-col gap-4">
              <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Documentação</Link>
              <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Help Center</Link>
              <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">API Status</Link>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Legal</h4>
            <div className="flex flex-col gap-4">
              <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Privacidade</Link>
              <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Termos</Link>
              <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-brand-500 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 mt-24 pt-12 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
         <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">© 2026 Closify. Built for scale.</p>
         <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sistemas operacionais</span>
         </div>
      </div>
    </footer>
  );
};

export default Footer;
