import useSWR from 'swr';

const useCompanies = (slug, options) => {
  let apiRoute = `/api/workspace/${slug}/companies`;
  const page = options?.page;
  const pageSize = options?.pageSize;
  
  if (Number.isFinite(page) && Number.isFinite(pageSize)) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    apiRoute += `?${params.toString()}`;
  }

  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    data: data?.data,
    isLoading: !!slug && !error && !data,
    isError: error,
    mutate,
  };
};

export default useCompanies;
