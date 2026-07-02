/**
 * Sends an SMS using the Twilio REST API via direct HTTP request.
 * 
 * @param {Object} params
 * @param {string} params.to Recipient phone number (e.g. +1234567890)
 * @param {string} params.body Message text
 * @param {string} params.accountSid Twilio Account SID
 * @param {string} params.authToken Twilio Auth Token
 * @param {string} params.from Twilio virtual phone number
 * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
 */
export async function sendTwilioSms({ to, body, accountSid, authToken, from }) {
  if (!accountSid || !authToken || !from) {
    return { success: false, messageId: null, error: 'Missing Twilio configuration credentials.' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  formData.append('Body', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: data.message || `Twilio API returned status ${response.status}`
      };
    }

    return { success: true, messageId: data.sid || null, error: null };
  } catch (error) {
    console.error('[twilio-sms] Error sending message:', error);
    return { success: false, messageId: null, error: error.message };
  }
}

/**
 * Sends an SMS using the Plivo REST API via direct HTTP request.
 * 
 * @param {Object} params
 * @param {string} params.to Recipient phone number (e.g. +1234567890)
 * @param {string} params.body Message text
 * @param {string} params.authId Plivo Auth ID
 * @param {string} params.authToken Plivo Auth Token
 * @param {string} params.from Plivo virtual phone number or sender ID
 * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
 */
export async function sendPlivoSms({ to, body, authId, authToken, from }) {
  if (!authId || !authToken || !from) {
    return { success: false, messageId: null, error: 'Missing Plivo configuration credentials.' };
  }

  const url = `https://api.plivo.com/v1/Account/${authId}/Message/`;
  const authHeader = 'Basic ' + Buffer.from(`${authId}:${authToken}`).toString('base64');

  const payload = {
    src: from,
    dst: to,
    text: body,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: data.error || `Plivo API returned status ${response.status}`
      };
    }

    // Plivo returns message_uuid in api_id or message_uuid list
    const messageUuid = data.message_uuid && data.message_uuid[0] ? data.message_uuid[0] : null;

    return { success: true, messageId: messageUuid || data.api_id || null, error: null };
  } catch (error) {
    console.error('[plivo-sms] Error sending message:', error);
    return { success: false, messageId: null, error: error.message };
  }
}
