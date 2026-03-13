import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";

const testimonials = [
  {
    quote: "Nossas taxas de resposta no WhatsApp caíram de 45 min para 3 min. O resumo por IA nas conversas com clientes enterprise salva pelo menos 2h de cada vendedor por dia. Simplesmente o melhor sistema B2B do mercado.",
    author: "Renato Diniz",
    role: "Diretor Comercial, TechVision",
    color: "from-indigo-500 to-purple-600"
  },
  {
    quote: "A facilidade de criar campos no-code permitiu que a gente adaptasse o funil de vendas exatamente pro nosso nicho de mercado imobiliário. O funil não é engessado como outros CRMs caríssimos.",
    author: "Larissa Cunha",
    role: "Gerente de Expansão, VendaMais Imóveis",
    color: "from-emerald-400 to-teal-600"
  },
  {
    quote: "Mudar para o Nextacular CRM duplicou nossa capacidade de follow-up. Conseguimos ver exatamente qual cliente está 'frio' pra reaquecer com automações de disparo rápido.",
    author: "Mariano Silva",
    role: "Founding Partner, StartLabs",
    color: "from-orange-500 to-rose-600"
  }
]

const Testimonial = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full py-32 bg-[#0a0a0b] relative overflow-hidden">
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
      
      <div className="relative flex flex-col items-center px-6 mx-auto sm:px-8 max-w-7xl">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, margin: "-50px" }}
           className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-sm font-medium text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            {t("landing.testimonial.badge", "100% de Aprovação")}
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white mb-6">Equipes de vendas inteiras estão mudando para o Nextacular</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testi, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative px-8 py-12 bg-zinc-900/40 border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors backdrop-blur-sm flex flex-col justify-between"
            >
              <div className="absolute -top-4 -left-4 text-8xl text-indigo-500/10 font-serif leading-none">&ldquo;</div>
              
              <h3 className="relative z-10 text-lg md:text-xl font-medium leading-relaxed text-zinc-300 mb-10">
                "{testi.quote}"
              </h3>
              
              <div className="relative z-10 flex items-center space-x-4 mt-auto">
                <div className={`w-12 h-12 bg-gradient-to-br ${testi.color} rounded-full shadow-lg border-2 border-[#0a0a0b]`} />
                <div>
                  <h4 className="text-lg font-bold text-white tracking-tight leading-tight">
                    {testi.author}
                  </h4>
                  <span className="text-zinc-500 text-sm font-medium">
                    {testi.role}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonial;
