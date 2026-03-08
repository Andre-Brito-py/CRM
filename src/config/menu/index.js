const menu = (workspaceId) => [
  {
    name: 'Workspace',
    menuItems: [
      {
        name: 'common.label.home',
        path: `/account/${workspaceId}`,
      },
      {
        name: 'Inbox',
        path: `/account/${workspaceId}/inbox`,
      },
      {
        name: 'Pipeline',
        path: `/account/${workspaceId}/pipeline`,
      },
      {
        name: 'Contacts',
        path: `/account/${workspaceId}/contacts`,
      },
      {
        name: 'Companies',
        path: `/account/${workspaceId}/companies`,
      },
      {
        name: 'Tasks',
        path: `/account/${workspaceId}/tasks`,
      },
      {
        name: 'common.label.integrations',
        path: `/account/${workspaceId}/integrations`,
      },
      {
        name: 'Automations',
        path: `/account/${workspaceId}/automations`,
      },
      {
        name: 'Analytics',
        path: `/account/${workspaceId}/analytics`,
      },
    ],
  },
  {
    name: 'Settings',
    menuItems: [
      {
        name: 'settings.workspace.information',
        path: `/account/${workspaceId}/settings/general`,
      },
      {
        name: 'settings.domain.configuration',
        path: `/account/${workspaceId}/settings/domain`,
      },
      {
        name: 'settings.team.management',
        path: `/account/${workspaceId}/settings/team`,
      },
      {
        name: 'Custom Fields',
        path: `/account/${workspaceId}/settings/custom-fields`,
      },
      {
        name: 'Message Templates',
        path: `/account/${workspaceId}/settings/templates`,
      },
      {
        name: 'settings.advanced',
        path: `/account/${workspaceId}/settings/advanced`,
      },
    ],
  },
];

export default menu;
