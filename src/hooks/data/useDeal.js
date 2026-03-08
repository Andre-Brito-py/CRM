import useSWR from 'swr';

const useDeal = (slug, dealId) => {
  const apiRoute = slug && dealId ? `/api/workspace/${slug}/deals/${dealId}` : null;
  const { data, error, mutate } = useSWR(apiRoute);
  return {
    deal: data?.data?.deal,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useDeal;
