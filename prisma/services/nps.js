import prisma from '@/prisma/index';

export const classifyNpsScore = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  if (score >= 9 && score <= 10) return 'promoter';
  if (score >= 7 && score <= 8) return 'passive';
  if (score >= 0 && score <= 6) return 'detractor';
  return null;
};

export const createNpsSurvey = async (workspaceId, { name, triggerType }) => {
  return await prisma.npsSurvey.create({
    data: {
      workspaceId,
      name,
      triggerType,
    },
  });
};

export const listNpsSurveys = async (workspaceId) => {
  return await prisma.npsSurvey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
};

export const createNpsResponse = async ({ surveyId, contactId, score, feedbackText }) => {
  const classification = classifyNpsScore(score);
  if (!classification) {
    const err = new Error('invalid_score');
    err.code = 'INVALID_SCORE';
    throw err;
  }

  const [survey, contact] = await Promise.all([
    prisma.npsSurvey.findUnique({
      where: { id: surveyId },
      select: { id: true, workspaceId: true },
    }),
    prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, workspaceId: true, name: true, email: true, phone: true },
    }),
  ]);

  if (!survey) {
    const err = new Error('survey_not_found');
    err.code = 'SURVEY_NOT_FOUND';
    throw err;
  }

  if (!contact) {
    const err = new Error('contact_not_found');
    err.code = 'CONTACT_NOT_FOUND';
    throw err;
  }

  if (survey.workspaceId !== contact.workspaceId) {
    const err = new Error('workspace_mismatch');
    err.code = 'WORKSPACE_MISMATCH';
    throw err;
  }

  const existing = await prisma.npsResponse.findUnique({
    where: {
      surveyId_contactId: {
        surveyId,
        contactId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    const err = new Error('already_responded');
    err.code = 'ALREADY_RESPONDED';
    throw err;
  }

  const response = await prisma.npsResponse.create({
    data: {
      workspaceId: survey.workspaceId,
      surveyId,
      contactId,
      score,
      feedbackText: feedbackText || null,
      classification,
    },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
      survey: { select: { id: true, name: true, triggerType: true } },
    },
  });

  return response;
};

export const getNpsScore = async (workspaceId, { from, to, surveyId } = {}) => {
  const where = {
    workspaceId,
    ...(surveyId ? { surveyId } : {}),
    ...(from || to
      ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      }
      : {}),
  };

  const [totalResponses, byClass] = await Promise.all([
    prisma.npsResponse.count({ where }),
    prisma.npsResponse.groupBy({
      by: ['classification'],
      where,
      _count: { _all: true },
    }),
  ]);

  const counts = { promoter: 0, passive: 0, detractor: 0 };
  byClass.forEach((row) => {
    counts[row.classification] = row._count._all;
  });

  const promotersPct = totalResponses > 0 ? (counts.promoter / totalResponses) * 100 : 0;
  const detractorsPct = totalResponses > 0 ? (counts.detractor / totalResponses) * 100 : 0;
  const npsScore = Math.round(promotersPct - detractorsPct);

  return {
    total_responses: totalResponses,
    promoters: counts.promoter,
    passives: counts.passive,
    detractors: counts.detractor,
    nps_score: npsScore,
  };
};

export const getNpsAnalytics = async (workspaceId, { from, to, surveyId } = {}) => {
  const where = {
    workspaceId,
    ...(surveyId ? { surveyId } : {}),
    ...(from || to
      ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      }
      : {}),
  };

  const [scoreStats, scoreDistribution, allResponsesDates] = await Promise.all([
    getNpsScore(workspaceId, { from, to, surveyId }),
    prisma.npsResponse.groupBy({
      by: ['score'],
      where,
      _count: { _all: true },
      orderBy: { score: 'asc' },
    }),
    prisma.npsResponse.findMany({
      where,
      select: { createdAt: true, classification: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const distribution = Array.from({ length: 11 }).map((_, s) => ({ score: s, count: 0 }));
  scoreDistribution.forEach((row) => {
    if (typeof row.score === 'number' && row.score >= 0 && row.score <= 10) {
      distribution[row.score].count = row._count._all;
    }
  });

  const trendMap = new Map();
  allResponsesDates.forEach((r) => {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const bucket = trendMap.get(key) || { month: key, promoters: 0, detractors: 0, total: 0 };
    bucket.total += 1;
    if (r.classification === 'promoter') bucket.promoters += 1;
    if (r.classification === 'detractor') bucket.detractors += 1;
    trendMap.set(key, bucket);
  });

  const trend = Array.from(trendMap.values()).map((b) => {
    const promotersPct = b.total > 0 ? (b.promoters / b.total) * 100 : 0;
    const detractorsPct = b.total > 0 ? (b.detractors / b.total) * 100 : 0;
    return {
      month: b.month,
      nps: Math.round(promotersPct - detractorsPct),
      total: b.total,
    };
  });

  return {
    ...scoreStats,
    distribution,
    trend,
  };
};

