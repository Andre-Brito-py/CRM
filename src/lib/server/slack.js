/**
 * Sends a message to a Slack channel via an Incoming Webhook.
 * Supports plain text and rich Slack Block Kit structures.
 * 
 * @param {string} webhookUrl The Slack Incoming Webhook URL
 * @param {string} text The fallback plain text message
 * @param {Array} [blocks=null] Optional Slack Block Kit blocks array for rich layout formatting
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendSlackMessage(webhookUrl, text, blocks = null) {
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return { success: false, error: 'Missing or invalid Slack webhook URL.' };
  }

  const payload = {
    text,
    ...(blocks && Array.isArray(blocks) ? { blocks } : {}),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      return {
        success: false,
        error: `Slack returned status ${response.status}: ${responseBody || 'No detail provided.'}`
      };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[slack] Failed to send webhook message:', error);
    return { success: false, error: error.message };
  }
}
