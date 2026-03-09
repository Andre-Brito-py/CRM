import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const OnboardingTour = ({ tourId, steps, active = true }) => {
    const { data: onboardingStatus, mutate } = useSWR('/api/user/onboarding', fetcher);
    const { t } = useTranslation();

    useEffect(() => {
        if (!active || !onboardingStatus || !steps || onboardingStatus[tourId]) return;

        const driverObj = driver({
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
            steps: steps.map(step => ({
                ...step,
                popover: {
                    ...step.popover,
                    className: 'premium-tour-popover',
                }
            })),
        });

        driverObj.drive();

        return () => {
            // Cleanup if needed
        };
    }, [onboardingStatus, steps, active, tourId]);

    const handleComplete = async (completed) => {
        try {
            await api('/api/user/onboarding', {
                method: 'POST',
                body: JSON.stringify({ tourId, completed }),
            });
            mutate();
        } catch (err) {
            console.error('Failed to save onboarding progress', err);
        }
    };

    return null;
};

export default OnboardingTour;
