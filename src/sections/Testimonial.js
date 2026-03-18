import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";
import { StarIcon } from '@heroicons/react/24/solid';

const Testimonial = () => {
  const { t } = useTranslation();

  const testimonials = [
    {
      name: "Alexandre Silva",
      role: "Diretor Comercial na TechFlow",
      content: "O Closify mudou completamente a forma como gerimos nossos leads de WhatsApp. A automação é impecável e a interface é extremamente profissional.",
      image: "https://i.pravatar.cc/150?u=alex"
    },
    {
      name: "Beatriz Santos",
      role: "CEO na InnovaSales",
      content: "A transição das planilhas para o Closify foi o melhor investimento que fizemos este ano. A visibilidade do pipeline é um divisor de águas.",
      image: "https://i.pravatar.cc/150?u=bea"
    },
    {
      name: "Ricardo Oliveira",
      role: "Head de Vendas na GlobalReach",
      content: "Um CRM feito para quem realmente entende de vendas. As sugestões de IA e a organização por times facilitaram muito nossa escala global.",
      image: "https://i.pravatar.cc/150?u=ric"
    }
  ];

  return (
    <section className="w-full py-40 bg-zinc-50 relative overflow-hidden font-executive">
      <div className="max-w-[1400px] mx-auto px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center px-4 py-2 mb-6 text-[10px] font-black text-brand-600 bg-brand-50 rounded-full border border-brand-100 tracking-[0.2em] uppercase">
               Proven Results
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase mb-8">
               Aprovado por <br />
               <span className="text-zinc-400">Líderes de Vendas.</span>
            </h2>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-10 bg-white border border-zinc-100 rounded-[40px] shadow-2xl flex flex-col gap-8 group hover:-translate-y-2 transition-transform duration-500"
            >
              <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => (
                    <StarIcon key={i} className="w-5 h-5 text-brand-500" />
                 ))}
              </div>
              <p className="text-zinc-600 text-lg font-medium leading-relaxed flex-1 italic">
                 "{t.content}"
              </p>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-zinc-100 overflow-hidden border-2 border-brand-50">
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                 </div>
                 <div className="text-left">
                    <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{t.name}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.role}</p>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
