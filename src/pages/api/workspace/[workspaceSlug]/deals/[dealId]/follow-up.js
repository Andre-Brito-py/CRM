import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

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
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!deal) {
      return res.status(404).json({ error: { msg: 'Deal not found' } });
    }

    if (deal.workspaceId !== workspace.id) {
      return res.status(403).json({ error: { msg: 'Access denied' } });
    }

    // Mock response if no API key
    if (!process.env.OPENAI_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(200).json({
        data: {
          message: `Olá ${deal.contact?.name || 'Cliente'},\n\nGostaria de saber se você teve a oportunidade de analisar a nossa proposta referente ao negócio "${deal.name}".\n\nEstou à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente,\n${session.user.name}`
        }
      });
    }

    const prompt = `
      Você é um assistente de vendas experiente.
      Gere uma mensagem de follow-up curta e profissional para um cliente.
      Contexto do Negócio:
      - Nome do Negócio: ${deal.name}
      - Valor: ${deal.amount || 'N/A'}
      - Cliente: ${deal.contact?.name || 'Cliente'}
      - Última Atividade: ${deal.activities[0]?.title || 'Nenhuma recente'}
      
      A mensagem deve ser educada, direta e incentivar uma resposta.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are a helpful sales assistant." },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
        throw new Error('OpenAI API Error');
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { message } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Unable to generate follow-up' } });
  }
};

export default handler;
