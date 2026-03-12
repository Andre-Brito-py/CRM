import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { normalizeProviderName } from './utils';

const normalizeEnv = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'prod' || v === 'production') return 'production';
  return 'sandbox';
};

const ensureDefaults = async () => {
  const any = await prisma.paymentProvider.findFirst({ select: { id: true } });
  if (any) return;

  await prisma.paymentProvider.createMany({
    data: [
      { name: 'asaas', displayName: 'Asaas', status: 'active' },
      { name: 'stripe', displayName: 'Stripe', status: 'active' },
      { name: 'pagarme', displayName: 'Pagar.me', status: 'disabled' },
      { name: 'mercadopago', displayName: 'Mercado Pago', status: 'disabled' },
    ],
  });
};

export const getPaymentProviderEnvironment = async (providerName) => {
  const globalEnv = await getSystemConfig('PAYMENT_ENV', process.env.PAYMENT_ENV);
  const providerEnv = await getSystemConfig(`PAYMENT_ENV_${String(providerName || '').toUpperCase()}`, null);
  return normalizeEnv(providerEnv || globalEnv || 'sandbox');
};

export const getActiveProviderWithCredential = async (providerName) => {
  const name = normalizeProviderName(providerName);
  await ensureDefaults();
  const provider = await prisma.paymentProvider.findUnique({
    where: { name },
    select: { id: true, name: true, displayName: true, status: true },
  });

  if (!provider) throw new Error('Provider not found');
  if (provider.status !== 'active') throw new Error('Provider disabled');

  const environment = await getPaymentProviderEnvironment(name);
  const credential = await prisma.paymentProviderCredential.findUnique({
    where: { providerId_environment: { providerId: provider.id, environment } },
  });
  if (!credential) throw new Error('Provider credentials missing');

  return { provider, credential, environment };
};
