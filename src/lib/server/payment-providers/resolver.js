import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { buildProviderInstance } from './factory';
import { getActiveProviderWithCredential, getPaymentProviderEnvironment } from './credentials';

export const getWorkspaceProviderName = async (workspaceId) => {
  const setting = await prisma.workspacePaymentSetting.findUnique({
    where: { workspaceId },
    select: { provider: { select: { name: true } } },
  });

  if (setting?.provider?.name) return setting.provider.name;

  const fallback = await getSystemConfig('DEFAULT_WORKSPACE_PAYMENT_PROVIDER', 'asaas');
  return String(fallback || 'asaas').toLowerCase();
};

export const getProvider = async (workspaceId) => {
  const providerName = await getWorkspaceProviderName(workspaceId);
  const { provider, credential, environment } = await getActiveProviderWithCredential(providerName);
  return buildProviderInstance({ provider, credential, environment });
};

const parseDecimalConfig = (value, fallback = 0) => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

export const getPlatformFeeSettings = async (workspaceId) => {
  const systemPercentage = await getSystemConfig('PLATFORM_FEE_PERCENTAGE', '0');
  const systemFixed = await getSystemConfig('PLATFORM_FEE_FIXED', '0');

  let percentage = parseDecimalConfig(systemPercentage, 0);
  let fixed = parseDecimalConfig(systemFixed, 0);

  if (workspaceId) {
    const workspaceSetting = await prisma.workspacePaymentSetting.findUnique({
      where: { workspaceId },
      select: { platformFeePercentage: true, platformFeeFixed: true, providerId: true },
    });

    if (workspaceSetting?.platformFeePercentage != null) {
      percentage = Number(workspaceSetting.platformFeePercentage);
    }
    if (workspaceSetting?.platformFeeFixed != null) {
      fixed = Number(workspaceSetting.platformFeeFixed);
    }
  }

  return { percentage, fixed };
};

export const calculateFees = ({ amount, percentage, fixed }) => {
  const gross = Number(amount || 0);
  const fee = (gross * (Number(percentage || 0) / 100)) + Number(fixed || 0);
  const platformFee = Math.max(0, Number(fee.toFixed(2)));
  const netAmount = Math.max(0, Number((gross - platformFee).toFixed(2)));
  return { platformFee, netAmount };
};

export const resolveWebhookProvider = async ({ req, providerName }) => {
  const explicit = providerName ? String(providerName).toLowerCase() : null;
  const headerProvider = req.headers['x-payment-provider'] ? String(req.headers['x-payment-provider']).toLowerCase() : null;
  const stripeSignature = req.headers['stripe-signature'];
  const asaasToken = req.headers['asaas-access-token'];
  const mercadoPagoSignature = req.headers['x-signature'];
  const mercadoPagoRequestId = req.headers['x-request-id'];
  const pagarmeSignature = req.headers['x-hub-signature-256'];

  const inferred =
    explicit ||
    headerProvider ||
    (stripeSignature ? 'stripe' : null) ||
    (asaasToken ? 'asaas' : null) ||
    (pagarmeSignature ? 'pagarme' : null) ||
    (mercadoPagoSignature && mercadoPagoRequestId ? 'mercadopago' : null);

  const name = inferred || 'asaas';
  const environment = await getPaymentProviderEnvironment(name);
  const { provider, credential } = await getActiveProviderWithCredential(name);
  return buildProviderInstance({ provider, credential, environment });
};
