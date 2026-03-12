import { createNpsResponse } from '@/prisma/services/nps';
import { processAutomation } from '@/prisma/services/automation';

const handler = async (req, res) => {
  const { method } = req;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  try {
    const { surveyId, contactId, score, feedback_text } = req.body || {};

    if (!surveyId || !contactId) {
      return res.status(400).json({ error: { msg: 'surveyId and contactId are required' } });
    }

    const parsedScore = typeof score === 'string' ? parseInt(score, 10) : score;
    const responseRow = await createNpsResponse({
      surveyId,
      contactId,
      score: parsedScore,
      feedbackText: feedback_text || null,
    });

    const eventData = {
      npsResponse: responseRow,
      survey: responseRow.survey,
      contact: responseRow.contact,
      contactId: responseRow.contactId,
      occurredAt: responseRow.createdAt,
    };

    processAutomation(responseRow.workspaceId, 'NPS_RESPONSE_RECEIVED', eventData).catch((err) =>
      console.error('Error triggering automation NPS_RESPONSE_RECEIVED:', err)
    );

    if (responseRow.classification === 'promoter') {
      processAutomation(responseRow.workspaceId, 'NPS_PROMOTER', eventData).catch((err) =>
        console.error('Error triggering automation NPS_PROMOTER:', err)
      );
    }

    if (responseRow.classification === 'detractor') {
      processAutomation(responseRow.workspaceId, 'NPS_DETRACTOR', eventData).catch((err) =>
        console.error('Error triggering automation NPS_DETRACTOR:', err)
      );
    }

    return res.status(201).json({ data: { response: responseRow } });
  } catch (error) {
    const code = error?.code || null;
    if (code === 'INVALID_SCORE') {
      return res.status(400).json({ error: { msg: 'Score must be between 0 and 10' } });
    }
    if (code === 'SURVEY_NOT_FOUND' || code === 'CONTACT_NOT_FOUND') {
      return res.status(404).json({ error: { msg: 'Not found' } });
    }
    if (code === 'WORKSPACE_MISMATCH') {
      return res.status(400).json({ error: { msg: 'Invalid survey/contact pair' } });
    }
    if (code === 'ALREADY_RESPONDED') {
      return res.status(409).json({ error: { msg: 'Already responded' } });
    }

    console.error('api/nps/respond error:', error);
    return res.status(500).json({ error: { msg: 'Unable to submit response' } });
  }
};

export default handler;

