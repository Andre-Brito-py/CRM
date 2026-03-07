const api = async (url, options) => {
  const { body, headers, ...opts } = options;
  const requestBody = JSON.stringify(body);
  const response = await fetch(url, {
    body: requestBody,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...opts,
  });
  let result;
  try {
    result = await response.json();
  } catch (e) {
    result = { error: { msg: 'Invalid JSON response from server', debug: e.message } };
  }
  return { status: response.status, ...result, url };
};

export default api;
