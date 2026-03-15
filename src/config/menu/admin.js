const menu = () => [
  {
    name: 'Admin',
    menuItems: [
      {
        name: 'Dashboard',
        path: '/admin',
      },
      {
        name: 'AI / Usage',
        path: '/admin/ai/usage',
      },
      {
        name: 'API Settings',
        path: '/admin/settings',
      },
      {
        name: 'Workspaces',
        path: '/admin/workspaces',
      },
      {
        name: 'Users',
        path: '/admin/users',
      },
      {
        name: 'Payments',
        path: '/admin/payments',
      },
      {
        name: 'Payments (Overdue)',
        path: '/admin/payments/overdue',
      },
      {
        name: 'Payments (Forecast)',
        path: '/admin/payments/forecast',
      },
      {
        name: 'Finance / Payment Providers',
        path: '/admin/finance/payment-providers',
      },
      {
        name: 'Finance / Workspace Gateways',
        path: '/admin/finance/workspace-payment-settings',
      },
      {
        name: 'Finance / Platform Revenue',
        path: '/admin/finance/revenue',
      },
      {
        name: 'Finance / Coupons & Promos',
        path: '/admin/finance/coupons',
      },
      {
        name: 'Plans',
        path: '/admin/plans',
      },
      {
        name: 'System',
        path: '/admin/system',
      },
    ],
  },
];

export default menu;
