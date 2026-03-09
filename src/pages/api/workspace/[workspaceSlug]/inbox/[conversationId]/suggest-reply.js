import { validateSession } from '@/config/api-validation';
import { getConversation } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, conversationId } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  try {
    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: { msg: 'Conversation not found' } });
    }

    if (conversation.workspaceId !== workspace.id) {
      return res.status(403).json({ error: { msg: 'Access denied' } });
    }

    const { getSystemConfig } = await import('@/lib/server/config');
    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!openAiApiKey) {
      return res.status(400).json({ error: { msg: 'OpenAI API key is missing. Please configure it in Super Admin settings.' } });
    }

    // Format messages for OpenAI
    // INBOUND (from contact) -> user
    // OUTBOUND (from us) -> assistant
    const messages = conversation.messages.map(m => ({
      role: m.direction === 'OUTBOUND' ? 'assistant' : 'user',
      content: m.content
    }));

    const systemPrompt = `You are a helpful customer support assistant for ${workspace.name}. 
    Your goal is to help the customer with their inquiries in a professional, friendly, and concise manner.
    Draft a response to the last message from the user. Do not include placeholders like "[Your Name]".`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10) // Context window of last 10 messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return res.status(500).json({ error: { msg: 'Failed to generate response from AI provider' } });
    }

    const data = await response.json();
    const suggestion = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { suggestion } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Unable to generate response' } });
  }
};

export default handler;
