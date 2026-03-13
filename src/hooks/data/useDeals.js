import useSWR from 'swr';

const useDeals = (slug, options) => {
  let apiRoute = `/api/workspace/${slug}/deals`;
  const page = options?.page;
  const pageSize = options?.pageSize;
  const compact = options?.compact;

  const params = new URLSearchParams();
  if (Number.isFinite(page)) params.set('page', String(page));
  if (Number.isFinite(pageSize)) params.set('pageSize', String(pageSize));
  if (compact) params.set('compact', '1');
  const suffix = params.toString();
  if (suffix) apiRoute += `?${suffix}`;

  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    data: data?.data,
    deals: data?.data?.deals,
    meta: data?.data?.meta,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useDeals;
