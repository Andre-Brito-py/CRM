import prisma from '@/prisma/index';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Twilio sends data in POST body (urlencoded) or GET query params
  const params = req.method === 'POST' ? req.body : req.query;
  
  const callStatus = params.CallStatus;
  const durationSeconds = params.CallDuration; // in seconds
  const to = params.To || 'Desconhecido';
  const workspaceId = req.query.workspaceId;

  // We only bill when the call completes successfully and duration is greater than 0
  if (!workspaceId || callStatus !== 'completed' || !durationSeconds) {
    return res.status(200).json({ success: true, msg: 'No billing required or missing workspaceId' });
  }

  const seconds = Number(durationSeconds);
  if (isNaN(seconds) || seconds <= 0) {
    return res.status(200).json({ success: true, msg: 'Call duration is zero or invalid' });
  }

  // Round up to the nearest minute (standard telecom billing practice)
  const minutes = Math.ceil(seconds / 60);

  try {
    // Run the balance deduction and transaction log inside a database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Fetch current workspace balance and currency
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { telephonyBalance: true, telephonyCurrency: true },
      });

      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      const currency = String(workspace.telephonyCurrency || 'USD').toUpperCase();
      
      // Define rates per minute based on the workspace currency (can be customized/loaded from config)
      let ratePerMinute = 0.05; // USD default
      if (currency === 'BRL') {
        ratePerMinute = 0.25; // BRL rate
      } else if (currency === 'EUR') {
        ratePerMinute = 0.05; // EUR rate
      }

      const totalCost = minutes * ratePerMinute;

      // 2. Deduct from balance (Prisma Decimal supports decrementing)
      const currentBalance = Number(workspace.telephonyBalance || 0);
      const newBalance = Math.max(currentBalance - totalCost, -9999.99); // Allow some overdraft limit but cap it

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { telephonyBalance: newBalance },
      });

      // 3. Create TelephonyTransaction debit record
      await tx.telephonyTransaction.create({
        data: {
          workspaceId,
          amount: -totalCost, // negative for debit
          currency,
          type: 'DEBIT',
          description: `Chamada de voz para ${to} (Duração: ${minutes} min, Tarifa: ${currency} ${ratePerMinute}/min)`,
        },
      });
    });

    console.log(`[twilio-voice-status] Workspace ${workspaceId} billed successfully. Duration: ${minutes} min.`);
    return res.status(200).json({ success: true, billedMinutes: minutes });
  } catch (error) {
    console.error('[twilio-voice-status] Error processing call billing:', error);
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
