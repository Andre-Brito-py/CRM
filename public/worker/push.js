self.addEventListener('push', function (event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  const data = event.data?.json() ?? {};
  
  // Custom Vysify Branding & Logic
  const title = data.title || 'Vysify Notification';
  const options = {
    body: data.body || 'You have a new update in your CRM.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png', // Monochrome for Android status bar
    vibrate: [100, 50, 100], // Professional vibration pattern
    image: data.image || null, // Banner image if provided
    tag: data.tag || 'vysify-default', // Group notifications
    renotify: true,
    data: {
      url: data.url || '/',
      actionUrl: data.actionUrl || data.url || '/',
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Abrir Vysify',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  let targetUrl = notification.data.url;
  
  // Handle specific action clicks
  if (action === 'open') {
    targetUrl = notification.data.actionUrl || notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(c => {
            if ('navigate' in c) return c.navigate(targetUrl);
        });
      }
      return clients.openWindow(targetUrl);
    })
  );
});
