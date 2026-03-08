import useSWR from 'swr';

const useTask = (slug, taskId) => {
  const apiRoute = `/api/workspace/${slug}/tasks/${taskId}`;
  const { data, error, mutate } = useSWR(slug && taskId ? apiRoute : null);
  return {
    task: data?.data?.task,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useTask;
