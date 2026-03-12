import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const useWorkspace = (slug) => {
  const apiRoute = `/api/workspace/${slug}`;
  const { data, error } = useSWR(slug ? apiRoute : null, fetcher);
  
  return {
    data,
    isLoading: !error && !data,
    isError: error,
  };
};

export default useWorkspace;
