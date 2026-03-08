import prisma from '@/prisma/index';

export const getSystemConfig = async (key, defaultValue = null) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (config) {
      return config.value;
    }
  } catch (error) {
    console.warn(`Failed to fetch system config for ${key}:`, error);
  }

  // Fallback to environment variable
  return process.env[key] || defaultValue;
};
