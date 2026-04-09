import Link from 'next/link';
import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { useTranslation } from 'react-i18next';

export default function Custom500() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <Meta 
        title="500 - Erro no Servidor | Vysify" 
        description="Ocorreu um erro interno em nossos servidores. Nossa equipe já foi notificada." 
      />

      <div className="relative mb-12 animate-in fade-in zoom-in duration-700">
        <h1 className="text-[12rem] font-black text-rose-500/10 dark:text-rose-400/5 leading-none select-none">
          500
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-rose-500/10 flex items-center justify-center blur-2xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             <div className="bg-rose-500 rounded-2xl p-4 shadow-xl shadow-rose-500/20">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
          </div>
        </div>
      </div>

      <div className="text-center max-w-md space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-200">
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Houve um contratempo interno
        </h2>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          Nossos servidores encontraram um obstáculo inesperado. Não se preocupe, nosso time de engenharia já foi notificado e estamos trabalhando para resolver isso.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 border-none shadow-xl"
          >
            Tentar novamente
          </Button>
          <Link href="/account" passHref legacyBehavior>
            <Button className="w-full sm:w-auto bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-none">
              Início
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-24 text-zinc-400 dark:text-zinc-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 animate-in fade-in duration-1000 delay-500">
        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Status: Investigando
      </div>
    </div>
  );
}
