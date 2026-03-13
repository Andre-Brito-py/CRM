import useSWR from 'swr';

const useCompanies = (slug) => {
  const apiRoute = `/api/workspace/${slug}/companies`;
  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    data: data?.data,
    isLoading: !!slug && !error && !data,
    isError: error,
    mutate,
  };
};

export default useCompanies;
