import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Cog8ToothIcon, ConstructIcon, WrenchScrewdriverIcon, SparklesIcon } from '@heroicons/react/24/outline';
import useSWR from 'swr';
import Button from '@/components/Button/index';
import fetcher from '@/lib/client/fetcher';

const FeatureGuard = ({ children, featureKey }) => {
  const router = useRouter();
  const { data: featureData } = useSWR('/api/public/features', fetcher);

  const maintenanceConfig = useMemo(() => {
    if (!featureData?.data) return null;
    return featureData.data[featureKey] || null;
  }, [featureData, featureKey]);

  // Se o recurso estiver marcado como offline, mostramos a tela premium de aviso
  if (maintenanceConfig && maintenanceConfig.offline === true) {
    return (
      <div className="relative min-h-[60vh] flex items-center justify-center p-6 md:p-12 overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-premium">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
           <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-200 dark:bg-brand-900/30 rounded-full blur-[100px]" />
           <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-200 dark:bg-indigo-900/30 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-xl w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500 blur-2xl opacity-20 animate-pulse" />
              <div className="relative h-24 w-24 bg-white dark:bg-zinc-800 rounded-3xl shadow-glass border border-brand-100 dark:border-zinc-700 flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-500">
                <SparklesIcon className="h-12 w-12 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-indigo-600 rounded-xl shadow-lg flex items-center justify-center -rotate-12 transition-transform duration-500 group-hover:rotate-0">
                <WrenchScrewdriverIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-executive font-black text-zinc-900 dark:text-white tracking-tight">
              {maintenanceConfig.title || 'Em breve algo novo'}
            </h2>
            <div className="w-16 h-1.5 bg-brand-600 mx-auto rounded-full" />
            <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              {maintenanceConfig.message || 'Estamos preparando esta ferramenta com o máximo de cuidado para você. Volte em breve!'}
            </p>
          </div>

          {maintenanceConfig.expectedAt && (
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-full border border-zinc-200 dark:border-zinc-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  Previsão: {new Date(maintenanceConfig.expectedAt).toLocaleDateString('pt-BR')}
                </span>
             </div>
          )}

          <div className="pt-4">
            <Button 
              className="px-8 py-4 bg-zinc-900 dark:bg-brand-600 text-white hover:opacity-90 transition-all rounded-2xl shadow-xl shadow-zinc-200 dark:shadow-brand-900/20 font-bold"
              onClick={() => router.back()}
            >
              Voltar para a Navegação
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default FeatureGuard;
