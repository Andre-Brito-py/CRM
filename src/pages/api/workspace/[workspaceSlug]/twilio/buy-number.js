import twilio from 'twilio';
import { getSystemConfig } from '@/lib/server/config';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: { msg: 'Número de telefone para compra é obrigatório.' } });
  }

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  // Determine if using custom Twilio or platform-shared Twilio
  const isCustomTwilio = !!(
    workspace.twilioAccountSid &&
    (workspace.twilioAuthToken || (workspace.twilioApiKey && workspace.twilioApiSecret))
  );

  const currency = String(workspace.telephonyCurrency || 'USD').toUpperCase();
  let setupCost = 2.00; // USD default setup/monthly charge
  if (currency === 'BRL') {
    setupCost = 10.00; // BRL setup/monthly charge
  }

  // Enforce balance check if using platform shared Twilio
  if (!isCustomTwilio) {
    const currentBalance = Number(workspace.telephonyBalance || 0);
    if (currentBalance < setupCost) {
      return res.status(400).json({
        error: {
          msg: `Saldo insuficiente para ativar número. Custo de ativação: ${currency} ${setupCost.toFixed(2)}. Seu saldo atual: ${currency} ${currentBalance.toFixed(2)}.`,
        },
      });
    }
  }

  // Load Twilio credentials
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

    // Determine voice webhook URL for this workspace
    const host = req.headers.host || 'vysify.com';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const voiceWebhookUrl = `${protocol}://${host}/api/integrations/twilio/voice?workspaceId=${workspace.id}`;

    // Purchase the number via Twilio API
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      voiceUrl: voiceWebhookUrl,
      voiceMethod: 'POST',
    });

    // Update database inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Save phone number on the workspace
      await tx.workspace.update({
        where: { id: workspace.id },
        data: { twilioPhoneNumber: purchased.phoneNumber },
      });

      // 2. If not custom Twilio (BYOT), deduct setup cost and log transaction
      if (!isCustomTwilio) {
        const freshWorkspace = await tx.workspace.findUnique({
          where: { id: workspace.id },
          select: { telephonyBalance: true },
        });
        const currentBalance = Number(freshWorkspace.telephonyBalance || 0);

        await tx.workspace.update({
          where: { id: workspace.id },
          data: { telephonyBalance: currentBalance - setupCost },
        });

        await tx.telephonyTransaction.create({
          data: {
            workspaceId: workspace.id,
            amount: -setupCost,
            currency,
            type: 'DEBIT',
            description: `Ativação de número de telefone virtual Twilio: ${purchased.phoneNumber}`,
          },
        });
      }
    });

    console.log(`[twilio-buy-number] Workspace ${workspace.id} purchased number ${purchased.phoneNumber}`);
    return res.status(200).json({
      data: {
        phoneNumber: purchased.phoneNumber,
        friendlyName: purchased.friendlyName,
      },
    });
  } catch (error) {
    console.error('[twilio-buy-number] Error buying phone number:', error);
    return res.status(500).json({ error: { msg: 'Erro ao adquirir número no Twilio: ' + error.message } });
  }
}
