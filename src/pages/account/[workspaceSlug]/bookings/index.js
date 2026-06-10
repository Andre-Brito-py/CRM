import { CalendarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const Bookings = () => {
  const { workspace } = useWorkspace();
  const { data, error, isLoading } = useSWR(
    workspace?.slug ? `/api/workspace/${workspace.slug}/bookings` : null,
    fetcher
  );

  const bookings = data?.data?.bookings || [];

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspace?.name} | Agendamentos`} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-glow-indigo/20">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">Autopilot Scheduling</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-3">
              Histórico de <span className="text-indigo-600">Agendamentos</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-xl leading-relaxed">
              Visualize todas as reuniões e serviços marcados automaticamente pela IA.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={workspace?.slug ? `/api/workspace/${workspace.slug}/bookings?export=true` : '#'}
              className="flex items-center px-6 py-3.5 text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/25 font-black text-[11px] uppercase tracking-widest italic group hover:scale-105 transition-all"
              onClick={(e) => {
                if (!workspace?.slug) e.preventDefault();
              }}
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-3 stroke-[3]" />
              Exportar para Excel
            </a>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="w-16 h-16 border-[5px] border-zinc-100 dark:border-zinc-800 border-t-indigo-600 rounded-full animate-spin relative z-10"></div>
            </div>
            <p className="text-zinc-400 font-black text-[10px] tracking-[0.3em] uppercase italic mt-10 animate-pulse">Sincronizando Agenda</p>
          </div>
        ) : bookings.length > 0 ? (
          <motion.div 
            id="bookings-table" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vysify-glass rounded-[2.5rem] overflow-hidden border border-zinc-100/50 dark:border-zinc-800/50 shadow-2xl"
          >
            <table className="min-w-full divide-y divide-zinc-50 dark:divide-zinc-800/30">
              <thead className="bg-zinc-50/30 dark:bg-zinc-900/30 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Título do Agendamento</th>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Data / Hora</th>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Cliente</th>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Telefone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/30">
                <AnimatePresence>
                  {bookings.map((booking, idx) => (
                    <motion.tr 
                      key={booking.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
                    >
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-[15px] font-executive font-extrabold text-zinc-950 dark:text-white uppercase italic tracking-tight">
                          {booking.title || 'Reunião'}
                        </div>
                      </td>
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                          {new Date(booking.startAt).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 font-mono">
                          {booking.contact?.name || 'Desconhecido'}
                        </div>
                      </td>
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50 inline-block italic">
                          {booking.contact?.phone || '--'}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        ) : (
          <div className="vysify-glass p-20 text-center rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800/50">
            <h3 className="text-2xl font-executive font-extrabold text-zinc-900 dark:text-white uppercase italic tracking-tight mb-3">
              Nenhum <span className="text-zinc-400 font-medium">Agendamento Encontrado</span>
            </h3>
            <p className="text-zinc-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed italic">
              Ainda não existem reuniões ou serviços marcados pela IA para este workspace.
            </p>
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default Bookings;
