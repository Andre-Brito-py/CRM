import { getSystemConfig } from '@/lib/server/config';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  // Twilio sends webhooks via POST by default, but we can support GET for easy testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  // Twilio passes parameters in req.body (for POST) or req.query (for GET)
  const params = req.method === 'POST' ? req.body : req.query;
  const to = params.To;
  
  if (!to) {
    res.setHeader('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="pt-BR">Número de destino não fornecido.</Say>
</Response>`);
  }

  // Look up workspace custom caller ID if workspaceId or workspaceSlug is provided in the webhook URL
  const workspaceId = req.query.workspaceId || params.workspaceId;
  const workspaceSlug = req.query.workspaceSlug || params.workspaceSlug;
  
  let workspace = null;
  if (workspaceId || workspaceSlug) {
    workspace = await prisma.workspace.findFirst({
      where: {
        OR: [
          ...(workspaceId ? [{ id: String(workspaceId) }] : []),
          ...(workspaceSlug ? [{ slug: String(workspaceSlug) }] : []),
        ],
        deletedAt: null
      },
      select: {
        id: true,
        twilioPhoneNumber: true,
        telephonyBalance: true,
        telephonyCurrency: true,
      }
    });
  }

  // Enforce balance checks before connecting the outbound call
  if (workspace) {
    const balance = Number(workspace.telephonyBalance || 0);
    if (balance <= 0) {
      res.setHeader('Content-Type', 'text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="pt-BR">Saldo insuficiente para completar a chamada. Por favor, recarregue no painel do Víssifai.</Say>
</Response>`);
    }
  }

  // Get the caller ID (our Twilio number) from workspace, query parameter, system config, or environment variables
  const callerId = workspace?.twilioPhoneNumber ||
                   req.query.from || 
                   await getSystemConfig('TWILIO_PHONE_NUMBER', process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM);

  res.setHeader('Content-Type', 'text/xml');

  // If the target is a Twilio Client (browser session), route to client
  if (to.startsWith('client:')) {
    const clientName = to.replace('client:', '');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Client>${clientName}</Client>
    </Dial>
</Response>`);
  }

  // If it's a phone number, dial outbound using caller ID
  if (!callerId) {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="pt-BR">Erro de configuração: Número de origem Twilio não configurado.</Say>
</Response>`);
  }

  // Build the status callback URL dynamically to rate and bill the call
  let numberElement = `<Number>${to}</Number>`;
  if (workspace?.id) {
    const host = req.headers.host || 'vysify.com';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const callbackUrl = `${protocol}://${host}/api/integrations/twilio/voice-status?workspaceId=${workspace.id}`;
    numberElement = `<Number statusCallbackEvent="completed" statusCallback="${callbackUrl}">${to}</Number>`;
  }

  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${callerId}">
        ${numberElement}
    </Dial>
</Response>`);
}
