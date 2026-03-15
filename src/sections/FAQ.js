import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslation } from "react-i18next";

const getFaqs = (t) => [
  {
    question: t("landing.faq.q1", "Como o Closify CRM garante a segurança dos meus dados?"),
    answer: t("landing.faq.a1", "Utilizamos isolamento multi-tenant rigoroso, criptografia de ponta e trilhas de auditoria para todas as ações sensíveis. Além disso, oferecemos ferramentas nativas para conformidade com a LGPD."),
  },
  {
    question: t("landing.faq.q2", "Posso automatizar o envio de pesquisas de satisfação?"),
    answer: t("landing.faq.a2", "Sim! Nosso módulo de NPS permite criar pesquisas e dispará-las automaticamente via WhatsApp ou E-mail com base em gatilhos do seu funil de vendas."),
  },
  {
    question: t("landing.faq.q3", "Como funcionam as integrações via API e Zapier?"),
    answer: t("landing.faq.a3", "Oferecemos chaves de API por workspace e suporte nativo a webhooks. Você pode conectar o Closify a mais de 5.000 aplicativos através do Zapier ou Make com facilidade."),
  },
  {
    question: t("landing.faq.question.ia", "Como funciona a Inteligência Artificial no Closify CRM?"),
    answer: t("landing.faq.answer.ia", "Nossa IA analisa todo o histórico de conversas e o contexto da sua empresa para sugerir respostas baseadas em gatilhos de vendas. Ela também resume longas reuniões e sinaliza quais negócios (Deals) estão com probabilidade de sucesso (Pipeline Insights) e quais precisam de follow-up urgente."),
  },
  {
    question: t("landing.faq.question.omnichannel", "Posso conectar meu WhatsApp e Instagram direto na plataforma?"),
    answer: t("landing.faq.answer.omnichannel", "Sim! Com a integração Omnichannel, todas as mensagens de WhatsApp, Instagram Direct e E-mail chegam na mesma caixa de entrada da sua equipe. Você não precisa ficar trocando de aba e ainda pode acionar automações No-code para responder dúvidas fora de hora."),
  },
  {
    question: t("landing.faq.question.nocode", "O que significa 'criar ferramentas No-code' internamente?"),
    answer: t("landing.faq.answer.nocode", "O Closify permite que você crie campos personalizados (Custom Fields) ilimitados, formulários dinâmicos de captura (Webhooks) e defina réguas de automação complexas de disparo sem escrever uma única linha de código. Você adapta o CRM ao seu processo, e não o contrário."),
  },
];

const FAQ = () => {
  const { t } = useTranslation();
  const faqs = getFaqs(t);
  const [openIndex, setOpenIndex] = useState(0); // O primeiro item começa aberto

  return (
    <div id="faq" className="w-full py-24 bg-[#0a0a0b] relative overflow-hidden text-white">
      {/* Glows Background */}
      <div className="absolute top-0 right-[10%] w-[30%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[50%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl px-6 mx-auto lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/20">
            {t("landing.faq.badge", "Tire suas dúvidas")}
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("landing.faq.title", "Perguntas Frequentes")}
          </h2>
          <p className="mt-4 text-xl text-zinc-400">
            {t("landing.faq.subtitle", "Tudo que você precisa saber para revolucionar seu processo de vendas hoje.")}
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`border rounded-2xl overflow-hidden transition-colors ${
                  isOpen 
                    ? 'bg-zinc-900/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5' 
                    : 'bg-zinc-900/30 border-white/5 hover:border-white/10'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex items-center justify-between w-full px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <span className={`text-lg font-medium transition-colors ${isOpen ? 'text-indigo-400' : 'text-zinc-200'}`}>
                    {faq.question}
                  </span>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white/5 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-indigo-500/10 text-indigo-400' : 'text-zinc-400'}`}>
                    <ChevronDownIcon className="w-5 h-5" />
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 text-zinc-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
