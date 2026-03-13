import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const OnboardingTour = ({ tourId, steps, active = true }) => {
    const { data: onboardingStatus, mutate } = useSWR('/api/user/onboarding', fetcher);
    const { t } = useTranslation();
    const driverRef = useRef(null);
    const startAttemptedRef = useRef(false);
    const startingRef = useRef(false);

    const handleComplete = useCallback(async (completed) => {
        if (!completed) return;
        try {
            await api('/api/user/onboarding', {
                method: 'POST',
                body: { tourId, completed: true },
            });
            mutate(); // Revalidate SWR
        } catch (err) {
            console.error('Failed to save onboarding status', err);
        }
    }, [mutate, tourId]);

    const isCompleted = !!onboardingStatus?.data?.[tourId];
    const canStart = !!(active && onboardingStatus?.data && steps && !isCompleted);

    useEffect(() => {
        if (!canStart || startAttemptedRef.current || startingRef.current) return;
        
        startingRef.current = true;
        let cancelled = false;

        const resolveElement = (step) => {
            if (typeof document === 'undefined') return null;
            const element = step?.element;
            if (!element) return null;
            if (typeof element === 'string') return document.querySelector(element);
            if (element instanceof HTMLElement) return element;
            if (element?.current instanceof HTMLElement) return element.current;
            return null;
        };

        const buildSteps = () => {
            if (!Array.isArray(steps)) return [];
            return steps
                .map((step) => ({ step, el: resolveElement(step) }))
                .filter(({ el }) => !!el)
                .map(({ step }) => ({
                    ...step,
                    popover: {
                        ...step.popover,
                        className: 'premium-tour-popover shadow-2xl border-none p-1',
                    }
                }));
        };

        const waitForAtLeastOneStep = async () => {
            const timeoutMs = 3000;
            const pollMs = 150;
            const startedAt = Date.now();

            while (!cancelled) {
                const resolved = buildSteps();
                if (resolved.length > 0) return resolved;
                if (Date.now() - startedAt >= timeoutMs) return [];
                await new Promise((r) => setTimeout(r, pollMs));
            }

            return [];
        };

        (async () => {
            // Wait a moment for layout to settle and SWR to potentially update
            await new Promise((r) => setTimeout(r, 500));
            
            const resolvedSteps = await waitForAtLeastOneStep();
            
            if (cancelled || resolvedSteps.length === 0 || startAttemptedRef.current) {
                startingRef.current = false;
                return;
            }

            // Double check completion status right before driving
            // This helps if the user fast-navigated and the prev tour just finished
            if (isCompleted) {
                startingRef.current = false;
                return;
            }

            startAttemptedRef.current = true;
            startingRef.current = false;

            if (driverRef.current) {
                driverRef.current.destroy();
            }

            driverRef.current = driver({
                showProgress: true,
                animate: true,
                overlayColor: 'rgba(0, 0, 0, 0.7)',
                nextBtnText: t('onboarding.tour.btn.next'),
                prevBtnText: t('onboarding.tour.btn.prev'),
                doneBtnText: t('onboarding.tour.btn.done'),
                allowClose: true,
                onDismissed: () => {
                    handleComplete(true);
                },
                steps: resolvedSteps,
            });

            driverRef.current.drive();
        })();

        return () => {
            cancelled = true;
        };
    }, [handleComplete, canStart, steps, t, isCompleted]);

    useEffect(() => {
        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
            }
        };
    }, []);

    return null;
};

export default OnboardingTour;
