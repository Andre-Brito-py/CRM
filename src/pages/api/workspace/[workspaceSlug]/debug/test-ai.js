import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { getSystemConfig } from '@/lib/server/config';
import { log } from '@/lib/server/logger';

/**
 * Live AI test endpoint — performs a REAL API call to verify the key actually works.
 * Only accessible to SUPERADMIN users.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  const session = await validateSession(req, res);
  if (!session) return;

  // Super Admin only
  if (session.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: { msg: 'Super Admin access required' } });
  }

  const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  const googleKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
  const openAiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

  const results = {};

  // --- Test Google Gemini ---
  if (googleKey) {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responda com exatamente: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        results.google = {
          ok: false,
          status: response.status,
          error: data?.error?.message || JSON.stringify(data),
          rawError: data,
        };
      } else {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        results.google = {
          ok: true,
          model,
          response: text.trim(),
          tokensUsed: data?.usageMetadata?.totalTokenCount || 0,
        };
      }
    } catch (err) {
      results.google = { ok: false, error: err.message };
    }
  } else {
    results.google = { ok: false, error: 'Key not configured' };
  }

  // --- Test OpenAI ---
  if (openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Responda com exatamente: OK' }],
          max_tokens: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        results.openai = {
          ok: false,
          status: response.status,
          error: data?.error?.message || JSON.stringify(data),
        };
      } else {
        results.openai = {
          ok: true,
          model: data.model,
          response: data?.choices?.[0]?.message?.content?.trim() || '',
          tokensUsed: data?.usage?.total_tokens || 0,
        };
      }
    } catch (err) {
      results.openai = { ok: false, error: err.message };
    }
  } else {
    results.openai = { ok: false, error: 'Key not configured' };
  }

  log({
    level: 'info',
    msg: 'ai_live_test',
    requestId,
    workspaceId: workspace.id,
    googleOk: results.google?.ok,
    openaiOk: results.openai?.ok,
  });

  const anyOk = results.google?.ok || results.openai?.ok;

  return res.status(200).json({
    data: {
      overallOk: anyOk,
      google: results.google,
      openai: results.openai,
    },
  });
}
