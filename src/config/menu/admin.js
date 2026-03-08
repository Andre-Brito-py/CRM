const menu = () => [
  {
    name: 'Admin',
    menuItems: [
      {
        name: 'Dashboard',
        path: '/admin',
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
