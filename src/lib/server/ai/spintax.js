import { generateChatCompletion } from '@/lib/server/ai/index';

/**
 * Resolves spintax formatting in a text (e.g. "{Olá|Oi|Tudo bem} amigo" -> "Oi amigo").
 * Supports nested groups (e.g. "{Olá|Oi {amigo|parceiro}}").
 * 
 * @param {string} text The text to process
 * @returns {string} The resolved text with random variations chosen
 */
export function resolveSpintax(text) {
  if (!text || typeof text !== 'string') return text;

  let resolved = text;
  // Match the innermost curly braces groups first to resolve them correctly
  const regex = /\{([^{}]+)\}/;

  let match;
  while ((match = regex.exec(resolved)) !== null) {
    const choices = match[1].split('|');
    const randomIndex = Math.floor(Math.random() * choices.length);
    const chosenValue = choices[randomIndex];
    resolved = resolved.substring(0, match.index) + chosenValue + resolved.substring(match.index + match[0].length);
  }

  return resolved;
}

/**
 * Uses AI to convert a standard email or message body into a Spintax template.
 * 
 * @param {string} text The original message text
 * @returns {Promise<string>} The Spintax template text
 */
export async function generateSpintaxWithAi(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text;
  }

  const systemPrompt = `Você é um especialista em marketing B2B e entregabilidade de e-mails (cold mailing).
Sua tarefa é receber um modelo de e-mail/mensagem e reescrevê-lo inserindo sintaxe de Spintax (com chaves e barras verticais) para palavras, saudações, frases e até parágrafos.
Exemplo:
Entrada: "Olá amigo, gostaria de marcar uma reunião de vendas com você."
Saída: "{Olá|Oi|Prezado} {amigo|parceiro|contato}, {gostaríamos de|gostaria de|estou entrando em contato para} {marcar uma reunião de vendas|agendar uma breve conversa|conversar sobre negócios} com você."

Garanta que as variações mantenham o mesmo sentido profissional do texto original e que a gramática seja consistente.
RETORNE APENAS o texto final contendo a estrutura Spintax completa, sem marcações de markdown (como blocos de código \`\`\`), sem introduções ou explicações.`;

  try {
    const response = await generateChatCompletion({
      messages: [{ role: 'user', content: text }],
      systemPrompt,
      options: { temperature: 0.7 }
    });

    return response?.trim() || text;
  } catch (error) {
    console.error('Error generating spintax with AI:', error);
    return text;
  }
}
