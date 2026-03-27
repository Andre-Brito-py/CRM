const api = async (url, options = {}) => {
  const { body, headers, ...opts } = options;
  const fetchOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...opts,
  };

  if (body !== undefined) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (response.status === 401 && typeof window !== 'undefined') {
    console.warn('API returned 401 (Unauthorized). Passive session check failed.');
    return { status: 401, ok: false, error: { msg: 'Session expired' } };
  }

  let result;
  try {
    result = await response.json();
  } catch (e) {
    result = { error: { msg: 'Invalid JSON response from server', debug: e.message } };
  }
  return { status: response.status, ok: response.ok, ...result, url };
};

export default api;
