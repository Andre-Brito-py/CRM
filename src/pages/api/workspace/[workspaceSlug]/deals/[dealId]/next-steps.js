import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, dealId } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        stage: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!deal) {
      return res.status(404).json({ error: { msg: 'Deal not found' } });
    }

    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!openAiApiKey) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return res.status(200).json({
        data: {
          recommendation: `Próximo passo recomendado:\n\nComo o negócio está na fase "${deal.stage.name}" e a última atividade foi "${deal.activities[0]?.title || 'há muito tempo'}", sugiro agendar uma ligação de acompanhamento para amanhã.`
        }
      });
    }

    const lastActivity = deal.activities[0];
    const prompt = `
      Recomende o próximo passo (Next Best Action) para este negócio:
      - Negócio: ${deal.name}
      - Estágio Atual: ${deal.stage.name}
      - Última Atividade: ${lastActivity ? `${lastActivity.type}: ${lastActivity.title}` : 'Nenhuma'}
      - Valor: ${deal.amount || 0}
      
      Seja direto e acionável. Ex: "Agendar demonstração", "Enviar contrato", "Ligar para qualificação".
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are a sales coach." },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API Error');
    }

    const data = await response.json();
    const recommendation = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { recommendation } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Unable to generate recommendation' } });
  }
};

export default handler;
