import useSWR from 'swr';

const useTasks = (slug, filters) => {
  let apiRoute = `/api/workspace/${slug}/tasks`;

  if (filters) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) {
      apiRoute += `?${params.toString()}`;
    }
  }

  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    tasks: data?.data?.tasks,
    meta: data?.data?.meta,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useTasks;
