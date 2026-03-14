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
        moduleKey: 'inbox',
      },
      {
        name: 'Pipeline',
        path: `/account/${workspaceId}/pipeline`,
        moduleKey: 'pipeline',
      },
      {
        name: 'Contacts',
        path: `/account/${workspaceId}/contacts`,
        moduleKey: 'contacts',
      },
      {
        name: 'Companies',
        path: `/account/${workspaceId}/companies`,
        moduleKey: 'companies',
      },
      {
        name: 'Tasks',
        path: `/account/${workspaceId}/tasks`,
        moduleKey: 'tasks',
      },
      {
        name: 'common.label.integrations',
        path: `/account/${workspaceId}/integrations`,
        moduleKey: 'integrations',
      },
      {
        name: 'Automations',
        path: `/account/${workspaceId}/automations`,
        moduleKey: 'automations',
      },
      {
        name: 'Analytics',
        path: `/account/${workspaceId}/analytics`,
        moduleKey: 'analytics',
      },
    ],
  },
  {
    name: 'Customer Satisfaction',
    moduleKey: 'nps',
    menuItems: [
      {
        name: 'NPS Surveys',
        path: `/account/${workspaceId}/customer-satisfaction/nps-surveys`,
        moduleKey: 'nps',
      },
      {
        name: 'NPS Responses',
        path: `/account/${workspaceId}/customer-satisfaction/responses`,
        moduleKey: 'nps',
      },
      {
        name: 'NPS Analytics',
        path: `/account/${workspaceId}/customer-satisfaction/analytics`,
        moduleKey: 'nps',
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
        moduleKey: 'custom_fields',
      },
      {
        name: 'Message Templates',
        path: `/account/${workspaceId}/settings/templates`,
        moduleKey: 'templates',
      },
      {
        name: 'settings.advanced',
        path: `/account/${workspaceId}/settings/advanced`,
      },
    ],
  },
];

export default menu;
