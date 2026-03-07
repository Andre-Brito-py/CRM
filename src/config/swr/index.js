import fetcher from '@/lib/client/fetcher';

const handleOnError = (error) => {
  console.error('SWR Error:', error);
  // Do not throw here, let useSWR handle the error state
};

const swrConfig = () => ({
  fetcher,
  onError: handleOnError,
  refreshInterval: 1000,
});

export default swrConfig;
