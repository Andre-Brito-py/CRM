import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';

/**
 * Generates a chat completion using either Google Gemini or OpenAI.
 * Prioritizes Gemini if GOOGLE_AI_API_KEY is present for "free tier" testing.
 * 
 * @param {Object} params
 * @param {Array} params.messages - Array of { role, content } messages.
 * @param {string} params.systemPrompt - Optional system instruction.
 * @param {Object} params.options - Optional overrides (model, temperature, etc.)
 */
export async function generateChatCompletion({ messages, systemPrompt, options = {} }) {
  const googleKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
  const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
  const primaryProvider = await getSystemConfig('PRIMARY_AI_PROVIDER', process.env.PRIMARY_AI_PROVIDER || 'GEMINI');

  const enableOpenAI = () => {
    const model = (options.model && (options.model.startsWith('gpt-') || options.model.startsWith('o1-')))
      ? options.model
      : 'gpt-4o-mini';
    return callOpenAI(openAiApiKey, messages, systemPrompt, { ...options, model });
  };

  const enableGemini = () => {
    const model = (options.model && options.model.startsWith('gemini-')) 
      ? options.model 
      : 'gemini-2.0-flash';
    return callGemini(googleKey, messages, systemPrompt, { ...options, model });
  };

  if (primaryProvider === 'OPENAI' && openAiApiKey) return enableOpenAI();
  if (primaryProvider === 'GEMINI' && googleKey) return enableGemini();
  
  // Fallbacks
  if (googleKey) return enableGemini();
  if (openAiApiKey) return enableOpenAI();

  throw new Error('MISSING_AI_API_KEY');
}

/**
 * Transcribes audio bytes using Gemini or Whisper (OpenAI).
 */
export async function transcribeAudio({ audioBytes, mimeType, options = {} }) {
  const googleKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
  const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

  if (googleKey) {
    const model = options.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;
    const base64 = Buffer.from(audioBytes).toString('base64');

    const body = {
      contents: [{
        parts: [
          { text: "Transcrição fiel e completa do áudio, sem comentários adicionais." },
          { inline_data: { mime_type: mimeType || 'audio/mpeg', data: base64 } }
        ]
      }]
    };

    const response = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  if (openAiApiKey) {
    // OpenAI fallback (Whisper)
    const blob = new Blob([audioBytes], { type: mimeType || 'audio/mpeg' });
    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('file', blob, 'audio');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiApiKey}` },
      body: form
    });
    const data = await response.json();
    return data?.text?.trim() || null;
  }

  throw new Error('MISSING_AI_API_KEY');
}

/**
 * Extracts text from image bytes using Gemini or GPT-4o (OpenAI).
 */
export async function extractTextFromImage({ imageBytes, mimeType, options = {} }) {
  const googleKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
  const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

  if (googleKey) {
    const model = options.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;
    const base64 = Buffer.from(imageBytes).toString('base64');

    const body = {
      contents: [{
        parts: [
          { text: "Extraia o texto visível da imagem e retorne apenas o texto (sem Markdown). Se não houver texto legível, retorne vazio." },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } }
        ]
      }]
    };

    const response = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  if (openAiApiKey) {
    // OpenAI fallback (Vision)
    const base64 = Buffer.from(imageBytes).toString('base64');
    const imageUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: [
            { type: 'text', text: 'Extraia o texto desta imagem.' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]}
        ]
      })
    });
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  }

  throw new Error('MISSING_AI_API_KEY');
}
async function callGemini(apiKey, messages, systemPrompt, options) {
  const model = options.model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI messages to Gemini contents (must start with user and alternate roles)
  const contents = [];
  for (const m of messages) {
    const contentText = String(m.content || '').trim();
    if (!contentText) continue; // Gemini fails on empty parts

    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    const last = contents[contents.length - 1];
    
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${contentText}`;
    } else {
      contents.push({
        role,
        parts: [{ text: contentText }]
      });
    }
  }

  // Gemini Rule: First message MUST be 'user'
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: '[Contexto anterior]' }]
    });
  }

  // If after filtering we have no content, we can't call Gemini
  if (contents.length === 0) {
    throw new Error('AI_NO_CONTENT');
  }

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1000,
    },
    // Disable aggressive safety filters for business processing
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  };

  if (systemPrompt) {
    body.system_instruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    log({ level: 'error', msg: 'gemini_api_error', status: response.status, error: err });
    const msg = err?.error?.message || `Status ${response.status}`;
    throw new Error(`Gemini API Error: ${msg}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Return in a format similar to what the app expects
  return {
    content: text.trim(),
    usage: {
      total_tokens: (data?.usageMetadata?.totalTokenCount || 0),
      prompt_tokens: (data?.usageMetadata?.promptTokenCount || 0),
      completion_tokens: (data?.usageMetadata?.candidatesTokenCount || 0),
    },
    provider: 'google',
    model
  };
}

async function callOpenAI(apiKey, messages, systemPrompt, options) {
  const model = options.model || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const fullMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    log({ level: 'error', msg: 'openai_api_error', status: response.status, error: err });
    throw new Error(`OpenAI API Error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';

  return {
    content: text.trim(),
    usage: data.usage || { total_tokens: 0 },
    provider: 'openai',
    model
  };
}
