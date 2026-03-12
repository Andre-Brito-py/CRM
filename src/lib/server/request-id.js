import crypto from 'crypto';

const normalizeHeaderValue = (value) => (Array.isArray(value) ? value[0] : value);

const getIncomingRequestId = (req) => {
  const candidate =
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    req.headers['x-amzn-trace-id'];
  const normalized = normalizeHeaderValue(candidate);
  const id = normalized ? String(normalized).trim() : '';
  return id.length > 0 ? id : null;
};

export const ensureRequestId = (req, res) => {
  const existing = req?.requestId ? String(req.requestId).trim() : '';
  const id = existing || getIncomingRequestId(req) || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  return id;
};
