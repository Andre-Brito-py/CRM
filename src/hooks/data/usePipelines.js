import useSWR from 'swr';

const usePipelines = (slug) => {
  const apiRoute = `/api/workspace/${slug}/pipelines`;
  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    ...data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default usePipelines;
