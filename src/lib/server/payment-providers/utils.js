export const toNumber = (value) => {
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value || 0);
};

export const normalizeProviderName = (name) => String(name || '').trim().toLowerCase();

export const mapLocalPaymentStatus = (status) => String(status || 'PENDING').toUpperCase();
