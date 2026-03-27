const menu = (workspaceId, options = {}) => {
  const isOwner = options?.isOwner !== false;
  const base = [
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
          name: 'Chat Interno',
          path: `/account/${workspaceId}/chat`,
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
          name: 'Web Forms',
          path: `/account/${workspaceId}/integrations/web-forms`,
          moduleKey: 'webforms',
          ownerOnly: true,
        },
        {
          name: 'common.label.integrations',
          path: `/account/${workspaceId}/integrations`,
          moduleKey: 'integrations',
          ownerOnly: true,
        },
        {
          name: 'Automations',
          path: `/account/${workspaceId}/automations`,
          moduleKey: 'automations',
          ownerOnly: true,
        },
        {
          name: 'Analytics',
          path: `/account/${workspaceId}/analytics`,
          moduleKey: 'analytics',
          ownerOnly: true,
        },
      ],
    },
    {
      name: 'Customer Satisfaction',
      moduleKey: 'nps',
      ownerOnly: true,
      menuItems: [
        {
          name: 'nps.menu.surveys',
          path: `/account/${workspaceId}/customer-satisfaction/nps-surveys`,
          moduleKey: 'nps',
          ownerOnly: true,
        },
        {
          name: 'nps.menu.responses',
          path: `/account/${workspaceId}/customer-satisfaction/responses`,
          moduleKey: 'nps',
          ownerOnly: true,
        },
        {
          name: 'nps.menu.analytics',
          path: `/account/${workspaceId}/customer-satisfaction/analytics`,
          moduleKey: 'nps',
          ownerOnly: true,
        },
      ],
    },
    {
      name: 'Settings',
      ownerOnly: true,
      menuItems: [
        {
          name: 'settings.workspace.information',
          path: `/account/${workspaceId}/settings/general`,
          ownerOnly: true,
        },
        {
          name: 'common.label.presets',
          path: `/account/${workspaceId}/settings/general`,
          ownerOnly: true,
        },
        {
          name: 'settings.domain.configuration',
          path: `/account/${workspaceId}/settings/domain`,
          ownerOnly: true,
        },
        {
          name: 'settings.team.management',
          path: `/account/${workspaceId}/settings/team`,
          ownerOnly: true,
        },
        {
          name: 'Custom Fields',
          path: `/account/${workspaceId}/settings/custom-fields`,
          moduleKey: 'custom_fields',
          ownerOnly: true,
        },
        {
          name: 'Message Templates',
          path: `/account/${workspaceId}/settings/templates`,
          moduleKey: 'templates',
          ownerOnly: true,
        },
        {
          name: 'Produtos',
          path: `/account/${workspaceId}/settings/payment-products`,
          ownerOnly: true,
        },
        {
          name: 'Pagamentos',
          path: `/account/${workspaceId}/settings/payments`,
          ownerOnly: true,
        },
        {
          name: 'settings.advanced',
          path: `/account/${workspaceId}/settings/advanced`,
          ownerOnly: true,
        },
      ],
    },
  ];

  if (isOwner) return base;

  return base
    .filter((section) => !section.ownerOnly)
    .map((section) => ({
      ...section,
      menuItems: (section.menuItems || []).filter((item) => !item.ownerOnly),
    }))
    .filter((section) => (section.menuItems || []).length > 0);
};

export default menu;
