import useSWR from 'swr';

const useTags = (slug) => {
  const apiRoute = slug ? `/api/workspace/${slug}/tags` : null;
  const { data, error, mutate } = useSWR(apiRoute);
  return {
    tags: data?.data?.tags,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useTags;
