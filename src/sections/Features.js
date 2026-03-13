import { motion } from 'framer-motion';
import { 
  ChatBubbleBottomCenterTextIcon, 
  BoltIcon, 
  ChartBarSquareIcon 
} from '@heroicons/react/24/outline';
import { useTranslation } from "react-i18next";

const getFeatures = (t) => [
  {
    name: t("landing.features.item1.title", 'Integração WhatsApp Nativa'),
    description: t("landing.features.item1.desc", 'Conecte seu WhatsApp Business ou Pessoal sem gambiarras. Receba, responda e faça gestão de fluxo de conversas omnichannel (Instagram, Email, WhatsApp) na mesma tela.'),
    icon: ChatBubbleBottomCenterTextIcon,
  },
  {
    name: t("landing.features.item2.title", 'Piloto Automático com Inteligência Artificial'),
    description: t("landing.features.item2.desc", 'Aumente o tempo útil do seu time. Resumos de conversas, sugestões de respostas por ChatGPT treinadas com seus dados e alertas de leads esfriando no funil.'),
    icon: BoltIcon,
  },
  {
    name: t("landing.features.item3.title", 'Poder de No-code & Workflow Engine'),
    description: t("landing.features.item3.desc", 'Crie regras, fluxos, gatilhos de e-mail e campos personalizados para o seu nicho sem escrever nenhuma linha de código. Nextacular se molda 100% à sua operação.'),
    icon: ChartBarSquareIcon,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
};

const Features = () => {
  const { t } = useTranslation();
  const features = getFeatures(t);

  return (
    <div id="features" className="w-full py-24 bg-[#0a0a0b] relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-[-10%] w-[30%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
      
      <div className="relative flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-3xl"
        >
          <div className="inline-flex items-center px-4 py-1.5 mb-6 text-sm font-medium text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            {t("landing.features.badge", "Why Nextacular CRM")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            {t("landing.features.title", "Stop losing deals to slow responses.")}
          </h2>
          <p className="mt-6 text-xl text-zinc-400 leading-relaxed">
            {t("landing.features.subtitle", "Our platform is engineered for teams that demand speed, clarity, and automation to close more deals in less time.")}
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              variants={cardVariants}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className="flex flex-col items-start p-8 space-y-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:bg-zinc-800/80 hover:border-indigo-500/50 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[100px] transition-colors group-hover:bg-indigo-500/10" />
              <div className="flex items-center justify-center w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7" />
              </div>
              <div className="space-y-4 relative z-10">
                <h3 className="text-2xl font-bold text-white tracking-tight">{feature.name}</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Inbox Screenshot */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="w-full mt-24 relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
          
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0b] p-2 sm:p-4">
             <div className="rounded-2xl flex flex-col overflow-hidden relative border border-white/5 bg-[#0a0a0b]">
               <div className="flex items-center justify-between p-4 bg-[#111113] border-b border-white/5">
                 <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                   <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                   <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                 </div>
                 <div className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Nextacular Omnichannel Inbox</div>
                 <div className="w-12"></div>
               </div>
               
               <div className="relative aspect-[21/9] w-full bg-zinc-900 overflow-hidden">
                 <img
                    src="/images/mockups/inbox.png"
                    alt="Omnichannel Inbox View"
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                 />
                 <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl"></div>
               </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Features;
