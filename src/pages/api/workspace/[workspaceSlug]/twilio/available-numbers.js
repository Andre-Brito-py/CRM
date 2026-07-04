import twilio from 'twilio';
import { getSystemConfig } from '@/lib/server/config';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug, areaCode, countryCode = 'US' } = req.query;

  if (!areaCode) {
    return res.status(400).json({ error: { msg: 'Código de área (DDD) é obrigatório.' } });
  }

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  // Load Twilio credentials (workspace custom or global)
  const accountSid = workspace.twilioAccountSid || await getSystemConfig('TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID);
  const authToken = workspace.twilioAuthToken || await getSystemConfig('TWILIO_AUTH_TOKEN', process.env.TWILIO_AUTH_TOKEN);
  const apiKey = workspace.twilioApiKey || await getSystemConfig('TWILIO_API_KEY', process.env.TWILIO_API_KEY);
  const apiSecret = workspace.twilioApiSecret || await getSystemConfig('TWILIO_API_SECRET', process.env.TWILIO_API_SECRET);

  if (!accountSid || (!authToken && (!apiKey || !apiSecret))) {
    return res.status(500).json({ error: { msg: 'As credenciais do Twilio não estão totalmente configuradas no sistema.' } });
  }

  try {
    let client;
    if (authToken) {
      client = twilio(accountSid, authToken);
    } else {
      client = twilio(apiKey, apiSecret, { accountSid });
    }

    // Call Twilio local phone number search
    const numbers = await client.availablePhoneNumbers(countryCode).local.list({
      areaCode: parseInt(areaCode, 10),
      limit: 5,
    });

    return res.status(200).json({
      data: numbers.map((n) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
      })),
    });
  } catch (error) {
    console.error('[twilio-available-numbers] Error searching numbers:', error);
    return res.status(500).json({ error: { msg: 'Erro ao buscar números no Twilio: ' + error.message } });
  }
}
