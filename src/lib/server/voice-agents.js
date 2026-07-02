/**
 * Dispatches an outbound call using Bland.ai API.
 * 
 * @param {Object} params
 * @param {string} params.to Recipient phone number (e.g. +1234567890)
 * @param {string} params.apiKey Bland.ai API Key
 * @param {string} params.prompt Instructions or script for the AI voice agent
 * @param {string} [params.voice='e1'] Optional voice model to use
 * @param {string} [params.language='pt-BR'] Optional language code
 * @returns {Promise<{success: boolean, callId: string|null, error: string|null}>}
 */
export async function triggerBlandAiCall({ to, apiKey, prompt, voice = 'e1', language = 'pt-BR' }) {
  if (!apiKey || !to || !prompt) {
    return { success: false, callId: null, error: 'Missing Bland.ai API Key, recipient number, or agent prompt.' };
  }

  const url = 'https://api.bland.ai/v1/calls';
  const payload = {
    phone_number: to,
    task: prompt,
    voice: voice,
    language: language,
    reduce_latency: true,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        callId: null,
        error: data.message || `Bland.ai API returned status ${response.status}`
      };
    }

    return { success: true, callId: data.call_id || null, error: null };
  } catch (error) {
    console.error('[bland-ai] Error triggering outbound call:', error);
    return { success: false, callId: null, error: error.message };
  }
}

/**
 * Dispatches an outbound call using Vapi.ai API.
 * 
 * @param {Object} params
 * @param {string} params.to Recipient phone number (e.g. +1234567890)
 * @param {string} params.apiKey Vapi.ai API Key
 * @param {string} params.assistantId The Vapi Assistant ID to run on the call
 * @param {string} [params.phoneNumberId=null] Optional Vapi phone number ID to dial from
 * @returns {Promise<{success: boolean, callId: string|null, error: string|null}>}
 */
export async function triggerVapiCall({ to, apiKey, assistantId, phoneNumberId = null }) {
  if (!apiKey || !to || !assistantId) {
    return { success: false, callId: null, error: 'Missing Vapi.ai API Key, recipient number, or assistant ID.' };
  }

  const url = 'https://api.vapi.ai/call/phone/startOutbound';
  const payload = {
    customer: {
      number: to,
    },
    assistantId: assistantId,
    ...(phoneNumberId ? { phoneNumberId } : {}),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        callId: null,
        error: data.message || `Vapi.ai API returned status ${response.status}`
      };
    }

    return { success: true, callId: data.id || null, error: null };
  } catch (error) {
    console.error('[vapi] Error triggering outbound call:', error);
    return { success: false, callId: null, error: error.message };
  }
}
