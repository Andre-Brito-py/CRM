import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  KeyIcon,
  CalendarIcon,
  EnvelopeIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

import AccountLayout from '@/layouts/AccountLayout';

const Integrations = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { t } = useTranslation();

  const integrations = [
    {
      name: 'WhatsApp Cloud API',
      description: 'Connect your WhatsApp Business Account to send and receive messages.',
      href: `/account/${workspaceSlug}/integrations/whatsapp`,
      icon: ChatBubbleLeftRightIcon,
      bgColor: 'bg-green-500',
    },
    {
      name: 'Email Inbox',
      description: 'Receive and reply to emails from the Inbox.',
      href: `/account/${workspaceSlug}/integrations/email`,
      icon: EnvelopeIcon,
      bgColor: 'bg-sky-600',
    },
    {
      name: 'Webhooks',
      description: 'Receive real-time events from your workspace.',
      href: `/account/${workspaceSlug}/integrations/webhooks`,
      icon: GlobeAltIcon,
      bgColor: 'bg-brand-500',
    },
    {
      name: 'API Keys',
      description: 'Generate API keys to access your workspace data programmatically.',
      href: `/account/${workspaceSlug}/integrations/api-keys`,
      icon: KeyIcon,
      bgColor: 'bg-gray-800',
    },
    {
      name: 'Google Calendar',
      description: 'Sync your calendar events with your workspace.',
      href: `/account/${workspaceSlug}/integrations/calendar`,
      icon: CalendarIcon,
      bgColor: 'bg-red-500',
    },
    {
      name: 'Gmail',
      description: 'Connect your Gmail account to sync emails.',
      href: `/account/${workspaceSlug}/integrations/gmail`,
      icon: EnvelopeIcon,
      bgColor: 'bg-red-600',
    },
    {
      name: 'Zapier',
      description: 'Automate workflows by connecting with 5000+ apps.',
      href: `/account/${workspaceSlug}/integrations/zapier`,
      icon: BoltIcon,
      bgColor: 'bg-orange-500',
    },
    {
      name: 'Instagram Direct',
      description: 'Respond to Instagram messages directly from your CRM inbox.',
      href: `/account/${workspaceSlug}/integrations/instagram`,
      icon: ChatBubbleLeftRightIcon,
      bgColor: 'bg-pink-600',
    },
  ];

  return (
    <AccountLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">{t('common.label.integrations')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('integrations.subtitle')}
          </p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <li key={integration.name} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                <div className="w-full flex items-center justify-between p-6 space-x-6">
                  <div className="flex-1 truncate">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-gray-900 text-sm font-medium truncate">{integration.name}</h3>
                      {integration.comingSoon && (
                        <span className="flex-shrink-0 inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-gray-500 text-sm truncate">{integration.description}</p>
                  </div>
                  <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full ${integration.bgColor} text-white`}>
                    <integration.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <div className="-mt-px flex divide-x divide-gray-200">
                    <div className="w-0 flex-1 flex">
                      {integration.comingSoon ? (
                        <span className="relative -mr-px w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-400 font-medium border border-transparent rounded-bl-lg cursor-not-allowed">
                          <span className="ml-3">{t('common.action.configure')}</span>
                        </span>
                      ) : (
                        <Link
                          href={integration.href}
                          className="relative -mr-px w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-bl-lg hover:text-gray-500"
                        >
                          <span className="ml-3">{t('common.action.configure')}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AccountLayout>
  );
};

export default Integrations;
