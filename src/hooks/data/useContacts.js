import useSWR from 'swr';

const useContacts = (slug) => {
  const apiRoute = `/api/workspace/${slug}/contacts`;
  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    ...data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useContacts;
