import prisma from '@/prisma/index';
import { rateLimit } from '@/lib/server/rateLimit';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { msg: 'Method Unsupported' } });
    return;
  }

  const rl = await rateLimit({ req, limit: 120, windowMs: 60_000 });
  if (!rl.ok) {
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  try {
    const statusConfig = await prisma.systemConfig.findUnique({
      where: { key: 'APP_FEATURES_STATUS' },
    });

    // Apenas expõe o JSON de status, que é informação pública
    const status = statusConfig?.value ? JSON.parse(statusConfig.value) : {};

    res.status(200).json({ data: status });
  } catch (error) {
    res.status(200).json({ data: {} }); // Retorna vazio em caso de erro para não quebrar o app
  }
};

export default handler;
