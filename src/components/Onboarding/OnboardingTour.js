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

    const handleComplete = useCallback(async (completed) => {
        try {
            mutate((current) => {
                const currentStatus = current?.data || {};
                return {
                    data: {
                        ...currentStatus,
                        [tourId]: completed ? true : (currentStatus[tourId] || false),
                    },
                };
            }, false);
            await api('/api/user/onboarding', {
                method: 'POST',
                body: { tourId, completed },
            });
            mutate();
        } catch (err) {
            mutate();
        }
    }, [mutate, tourId]);

    const isCompleted = !!onboardingStatus?.data?.[tourId];
    const shouldStart = !!(active && onboardingStatus?.data && steps && !isCompleted && !driverRef.current && !startAttemptedRef.current);

    useEffect(() => {
        if (!shouldStart) return;
        startAttemptedRef.current = true;

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
                        className: 'premium-tour-popover',
                    }
                }));
        };

        const waitForAtLeastOneStep = async () => {
            const timeoutMs = 2500;
            const pollMs = 100;
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
            const resolvedSteps = await waitForAtLeastOneStep();
            if (cancelled || resolvedSteps.length === 0) return;

            driverRef.current = driver({
                showProgress: true,
                animate: true,
                overlayColor: 'rgba(0, 0, 0, 0.75)',
                nextBtnText: t('onboarding.tour.btn.next'),
                prevBtnText: t('onboarding.tour.btn.prev'),
                doneBtnText: t('onboarding.tour.btn.done'),
                allowClose: true,
                onDismissed: () => {
                    handleComplete(true);
                },
                onDestroyed: () => {
                    handleComplete(true);
                },
                steps: resolvedSteps,
            });

            driverRef.current.drive();
        })();

        return () => {
            cancelled = true;
        };
    }, [handleComplete, shouldStart, steps, t]);

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
