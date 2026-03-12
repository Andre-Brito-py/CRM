import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, conversationId } = req.query;

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
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Last 50 messages for summary
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: { msg: 'Conversation not found' } });
    }

    if (conversation.messages.length === 0) {
      return res.status(200).json({ data: { summary: 'No messages to summarize yet.' } });
    }

    // Build a readable transcript
    const transcript = conversation.messages.map(msg => {
      const role = msg.direction === 'OUTBOUND' ? 'Agente' : (conversation.contact?.name || 'Cliente');
      return `${role}: ${msg.content}`;
    }).join('\n');

    // Fallback to smart local summary if no OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const contact = conversation.contact?.name || 'o cliente';
      const msgCount = conversation.messages.length;
      const inbound = conversation.messages.filter(m => m.direction === 'INBOUND').length;
      const outbound = conversation.messages.filter(m => m.direction === 'OUTBOUND').length;

      return res.status(200).json({
        data: {
          summary: `**Resumo da Conversa com ${contact}**\n\n` +
            `• ${msgCount} mensagens no total (${inbound} recebidas, ${outbound} enviadas).\n` +
            `• Última mensagem: "${conversation.messages[conversation.messages.length - 1]?.content?.slice(0, 80)}..."\n` +
            `• Status atual: ${conversation.status || 'Aberta'}.\n\n` +
            `_Adicione sua chave OpenAI nas configurações do sistema para obter resumos com IA._`
        }
      });
    }

    const prompt = `Resuma esta conversa de atendimento ao cliente em 3-5 pontos concisos. Identifique: (1) o problema ou necessidade principal, (2) o que foi dito/prometido, e (3) o próximo passo recomendado. Seja objetivo.\n\nTranscrição:\n${transcript}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um agente de suporte senior analisando conversas. Responda sempre em Português.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });

    if (!response.ok) throw new Error('OpenAI API Error');

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { summary } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Unable to generate summary' } });
  }
};

export default handler;
