import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { msg: 'Method Unsupported' } });
    return;
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
