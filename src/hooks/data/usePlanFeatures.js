import useSWR from 'swr';
import { useRouter } from 'next/router';
import fetcher from '@/lib/client/fetcher';

/**
 * Hook para consumir as features do plano do workspace atual.
 * Retorna { allowedModules, trial, plan, limits, isLoading }
 */
const usePlanFeatures = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const { data, error, isValidating } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/plan-features` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // cache por 1 minuto
    }
  );

  const planData = data?.data || null;

  return {
    allowedModules: planData?.allowedModules || {},
    trial: planData?.trial || { expired: false, daysLeft: null, hasTrial: false },
    plan: planData?.plan || 'FREE',
    limits: planData?.limits || {},
    isLoading: !data && !error && isValidating,
    error,
  };
};

export default usePlanFeatures;
