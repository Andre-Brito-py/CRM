const fetcher = async (url) => {
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    try {
      error.info = await response.json();
    } catch (e) {
      error.info = { msg: response.statusText };
    }
    error.status = response.status;
    throw error;
  }
  
  return response.json();
};

export default fetcher;
