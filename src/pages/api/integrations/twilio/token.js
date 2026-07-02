import twilio from 'twilio';
import { getSystemConfig } from '@/lib/server/config';

import prisma from '@/prisma/index';
import { isModuleAllowed } from '@/lib/server/subscription';

/**
 * Generates an Access Token for Twilio Client SDK to enable Click-to-Call in browser.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get Twilio Voice configurations
  const accountSid = await getSystemConfig('TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID);
  const apiKey = await getSystemConfig('TWILIO_API_KEY', process.env.TWILIO_API_KEY);
  const apiSecret = await getSystemConfig('TWILIO_API_SECRET', process.env.TWILIO_API_SECRET);
  const twimlAppSid = await getSystemConfig('TWILIO_TWIML_APP_SID', process.env.TWILIO_TWIML_APP_SID);

  if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
    return res.status(500).json({ error: 'Twilio Voice credentials are not fully configured.' });
  }

  // Enforce plan/subscription limits
  const { workspaceSlug } = req.query;
  if (workspaceSlug) {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: String(workspaceSlug), deletedAt: null },
      select: { id: true },
    });
    if (workspace) {
      const allowed = await isModuleAllowed(workspace.id, 'voice_dialer');
      if (!allowed) {
        return res.status(403).json({ error: 'VOICE_DIALER_MODULE_DISABLED' });
      }
    }
  }

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create dynamic identity for the logged-in agent / browser client session
    const identity = req.query.identity || `agent_${Math.floor(Math.random() * 10000)}`;

    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
    
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, // Allow receiving calls directly in the browser
    });

    token.addGrant(voiceGrant);

    res.status(200).json({
      identity,
      token: token.toJwt(),
    });
  } catch (error) {
    console.error('[twilio-token] Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate Twilio token: ' + error.message });
  }
}
