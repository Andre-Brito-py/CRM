import useSWR from 'swr';

const useContact = (slug, contactId) => {
  const apiRoute = slug && contactId ? `/api/workspace/${slug}/contacts/${contactId}` : null;
  const { data, error, mutate } = useSWR(apiRoute);
  return {
    contact: data?.data?.contact,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useContact;
