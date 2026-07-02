import { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  ChatBubbleLeftRightIcon, 
  ShieldCheckIcon,
  CheckIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';

export default function A2pRegistration() {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const [brandName, setBrandName] = useState('');
  const [website, setWebsite] = useState('');
  const [ein, setEin] = useState('');
  const [optInFlow, setOptInFlow] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!brandName || !website || !ein || !optInFlow) {
      toast.error('Preencha todas as informações obrigatórias.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Solicitação de Registro A2P 10DLC enviada com sucesso! Analisaremos em até 3 dias úteis.');
    }, 1500);
  };

  return (
    <AccountLayout>
      <div className="py-12 bg-[#09090b] text-zinc-100 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-[14px] flex items-center justify-center border border-amber-500/20">
              <ShieldCheckIcon className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Regulação de SMS EUA</span>
          </div>
          <h1 className="text-4xl font-executive font-extrabold text-white tracking-tighter leading-none mb-3">
            Conformidade A2P 10DLC (Twilio/Plivo)
          </h1>
          <p className="text-zinc-400 font-medium text-lg max-w-2xl leading-relaxed">
            As operadoras de telecomunicações dos EUA (AT&T, Verizon, T-Mobile) exigem o registro de campanhas A2P 10DLC para evitar bloqueios automáticos de mensagens de texto comerciais.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[28px] p-8">
            <h3 className="text-xl font-bold text-white mb-6">Solicitar Registro de Marca & Campanha</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome da Empresa (Legal Brand Name)</label>
                  <input 
                    type="text" 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Vysify Inc."
                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Website da Empresa</label>
                  <input 
                    type="url" 
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://vysify.com"
                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tax ID / EIN (EUA) ou CNPJ Equivalente</label>
                  <input 
                    type="text" 
                    value={ein}
                    onChange={(e) => setEin(e.target.value)}
                    placeholder="ex: 12-3456789"
                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fluxo de Consentimento de Opt-In (Como o Lead autorizou receber SMS?)</label>
                <textarea 
                  value={optInFlow}
                  onChange={(e) => setOptInFlow(e.target.value)}
                  rows={4}
                  placeholder="ex: O cliente insere seu telefone no nosso formulário de captura no site e marca a caixa 'Aceito receber lembretes e novidades via SMS'."
                  className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-[16px]"
                >
                  {submitting ? 'Enviando...' : 'Submeter Registro'}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-8">
              <h3 className="text-lg font-bold text-white mb-6">Checklist de Conformidade</h3>
              <ul className="space-y-4 text-sm text-zinc-400 font-medium">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span>**Presença de Opt-In Claro:** Não envie mensagens sem o consentimento prévio do Lead.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span>**Mensagem de Desativação (Opt-out):** Toda mensagem automatizada deve aceitar palavras como **STOP** para cancelamento.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span>**Transparência de Marca:** Identifique o nome da sua empresa no corpo da primeira mensagem enviada.</span>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-8 flex gap-4">
              <InformationCircleIcon className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-white mb-1">Por que isso é crítico?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  Mensagens não registradas têm taxa de entrega inferior a 30% nos EUA e geram multas pesadas das operadoras de telefonia por infrações de spam.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
