import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from "react-i18next";
import { 
  PlusIcon, 
  MinusIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const FAQ = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "O Closify integra com quais plataformas?",
      answer: "Integramos nativamente com WhatsApp, E-mail (Gmail/Outlook) e via Webhooks com milhares de outras ferramentas através de parceiros como Zapier."
    },
    {
      question: "Como funciona a automação de WhatsApp?",
      answer: "Você pode criar fluxos de resposta baseados em gatilhos específicos, como recebimento de novo lead ou mudança de estágio no funil. Tudo sem precisar programar."
    },
    {
       question: "Meus dados estão seguros?",
       answer: "Sim, utilizamos criptografia de ponta a ponta e infraestrutura bancária (AWS) para garantir que seus dados comerciais e de seus clientes estejam sempre protegidos."
    },
    {
       question: "Posso gerenciar múltiplos times?",
       answer: "Sim, o Closify permite criar diferentes espaços de trabalho (workspaces) e gerenciar permissões específicas para cada membro da sua equipe."
    }
  ];

  return (
    <section id="faq" className="w-full py-40 bg-white relative overflow-hidden font-executive border-t border-zinc-100">
      <div className="max-w-4xl mx-auto px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center px-4 py-2 mb-6 text-[10px] font-black text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 tracking-[0.2em] uppercase">
               Customer Intelligence
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase mb-4">
               Perguntas <br />
               <span className="text-zinc-400">Frequentes.</span>
            </h2>
          </motion.div>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="border-b border-zinc-100 last:border-0"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-8 flex items-center justify-between text-left group"
              >
                <span className={`text-xl font-bold uppercase tracking-tight transition-colors ${openIndex === index ? 'text-indigo-600' : 'text-zinc-900 group-hover:text-indigo-500'}`}>
                   {faq.question}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${openIndex === index ? 'bg-indigo-600 text-white' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100'}`}>
                  <ChevronDownIcon className={`w-5 h-5 transition-transform duration-500 ${openIndex === index ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-8 text-lg text-zinc-500 font-medium leading-relaxed max-w-3xl">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
