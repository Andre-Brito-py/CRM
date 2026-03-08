import useSWR from 'swr';

const useDeals = (slug) => {
  const apiRoute = `/api/workspace/${slug}/deals`;
  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    deals: data?.data?.deals,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useDeals;
