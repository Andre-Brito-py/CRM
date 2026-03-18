import { motion } from 'framer-motion';

const stats = [
  {
    value: '60%',
    label: 'Redução no tempo de resposta',
    description: 'Automação inteligente que atende seus clientes instantaneamente.'
  },
  {
    value: '40%',
    label: 'Aumento na Conversão',
    description: 'Transforme mais leads em clientes com um funil organizado.'
  },
  {
    value: '100%',
    label: 'Canais Centralizados',
    description: 'WhatsApp, E-mail e CRM em uma única arquitetura de alta performance.'
  }
];

const Stats = () => {
  return (
    <section className="py-32 bg-white relative overflow-hidden font-executive">
      {/* Visual Vitality - Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/[0.03] blur-[120px] rounded-full" />
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tighter mb-4 group-hover:scale-105 transition-transform duration-500">
                {stat.value}
              </div>
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-4">
                {stat.label}
              </h3>
              <p className="text-zinc-500 font-medium leading-relaxed">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
