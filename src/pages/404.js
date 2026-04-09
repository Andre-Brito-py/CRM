import Link from 'next/link';
import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { useTranslation } from 'react-i18next';

export default function Custom404() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <Meta 
        title="404 - Página Não Encontrada | Vysify" 
        description="A página que você está procurando não existe ou foi movida." 
      />

      <div className="relative mb-12 animate-in fade-in zoom-in duration-700">
        <h1 className="text-[12rem] font-black text-emerald-500/10 dark:text-emerald-400/5 leading-none select-none">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center blur-2xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             <img src="/images/logo-symbol.png" alt="Vysify" className="h-16 w-auto opacity-80" />
          </div>
        </div>
      </div>

      <div className="text-center max-w-md space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-200">
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Oops! Perdeu o rumo?
        </h2>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          A página que você está procurando não existe ou foi movida para um novo endereço no ecossistema do Vysify.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/account" passHref legacyBehavior>
            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-emerald-500/20">
              Ir para o Dashboard
            </Button>
          </Link>
          <Link href="/" passHref legacyBehavior>
            <Button className="w-full sm:w-auto bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-none">
              Início
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-24 text-zinc-400 dark:text-zinc-600 font-bold text-xs uppercase tracking-widest animate-in fade-in duration-1000 delay-500">
        Vysify CRM &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
