import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(workspaceId) {
  const { data: session } = useSession();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then((sub) => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime)) {
            setSubscription(sub);
            setIsSubscribed(true);
          }
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!registration) return;

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ),
      });

      setSubscription(sub);
      setIsSubscribed(true);

      // Send to backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: sub,
          workspaceId,
        }),
      });

      console.log('Subscribed to push notifications');
    } catch (error) {
      console.error('Failed to subscribe', error);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    await subscription.unsubscribe();
    setSubscription(null);
    setIsSubscribed(false);
    // Optionally notify backend to delete
  };

  return {
    isSubscribed,
    subscribe,
    unsubscribe,
    registration,
  };
}
