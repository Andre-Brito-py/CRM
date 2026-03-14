import { getSystemConfig } from '@/lib/server/config';

const getAsaasBaseUrl = async () => {
  const env = (await getSystemConfig('ASAAS_ENV', process.env.ASAAS_ENV)) || 'SANDBOX';
  const normalized = String(env).trim().toUpperCase();
  if (normalized === 'PROD' || normalized === 'PRODUCTION') return 'https://api.asaas.com/v3';
  return 'https://api-sandbox.asaas.com/v3';
};

const asaasRequest = async (path, { method = 'GET', query, body } = {}) => {
  const apiKey = await getSystemConfig('ASAAS_API_KEY', process.env.ASAAS_API_KEY);
  if (!apiKey) throw new Error('Asaas API key is missing');

  const baseUrl = await getAsaasBaseUrl();
  const userAgent = await getSystemConfig('ASAAS_USER_AGENT', process.env.ASAAS_USER_AGENT || 'Closify');

  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      access_token: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const msg =
      (data && typeof data === 'object' && Array.isArray(data.errors) && data.errors[0]?.description) ||
      (data && typeof data === 'object' && data?.error?.description) ||
      `Asaas request failed (${response.status})`;
    const error = new Error(msg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const findCustomerByExternalReference = async (externalReference) => {
  const result = await asaasRequest('/customers', {
    method: 'GET',
    query: { externalReference, limit: 1, offset: 0 },
  });
  return result?.data?.[0] || null;
};

export const createCustomer = async ({ name, email, phone, mobilePhone, externalReference }) => {
  return await asaasRequest('/customers', {
    method: 'POST',
    body: {
      name,
      email: email || undefined,
      phone: phone || undefined,
      mobilePhone: mobilePhone || undefined,
      externalReference: externalReference || undefined,
    },
  });
};

export const createPayment = async ({ customer, billingType, value, dueDate, description, externalReference, callback }) => {
  return await asaasRequest('/payments', {
    method: 'POST',
    body: {
      customer,
      billingType,
      value,
      dueDate,
      description: description || undefined,
      externalReference: externalReference || undefined,
      callback: callback || undefined,
    },
  });
};

export const getPayment = async (paymentId) => {
  return await asaasRequest(`/payments/${paymentId}`, { method: 'GET' });
};

export default asaasRequest;

