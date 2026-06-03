const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const aiContext = `A Acme Corp é uma loja especializada em tecnologia e conforto para o home office e o dia a dia. Vendemos produtos premium com entrega para todo o Brasil.

Nosso catálogo inclui:
- Cafeteiras inteligentes com touchscreen e controle por app, ideais para quem ama um bom café com praticidade.
- Cadeiras ergonômicas premium com suporte lombar ajustável, apoios de braço 3D e estrutura em alumínio, perfeitas para longas horas de trabalho.
- Fones de ouvido over-ear com cancelamento de ruído ativo, bateria de até 40h e áudio de alta fidelidade.

Política de vendas:
- Parcelamos em até 12x no cartão de crédito.
- Frete grátis para compras acima de R$ 500.
- Troca e devolução em até 30 dias.
- Não oferecemos descontos adicionais fora de promoções ativas.
- Prazo de entrega: 5 a 10 dias úteis.

Atendimento:
- Disponível de segunda a sexta, das 9h às 18h.
- Para dúvidas fora do horário, o assistente virtual pode ajudar com informações e envio de links de produtos.`;

async function main() {
  const result = await prisma.workspace.updateMany({
    where: { slug: 'acme-corp-premium' },
    data: { aiContext },
  });
  console.log(`✅ aiContext atualizado em ${result.count} workspace(s).`);
  console.log('\n--- Contexto definido ---');
  console.log(aiContext);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
