import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  KeyIcon,
  CalendarIcon,
  EnvelopeIcon,
  BoltIcon,
  ArrowRightIcon,
  SparklesIcon,
  CameraIcon,
  AtSymbolIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

import AccountLayout from '@/layouts/AccountLayout';

const Integrations = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { t } = useTranslation();

  const categories = [
    {
      id: 'communication',
      name: 'Omnichannel & Messaging',
      description: 'Centralize your customer conversations across all social channels.',
      items: [
        {
          name: 'WhatsApp Cloud',
          description: 'Official API integration for high-volume business messaging.',
          href: `/account/${workspaceSlug}/integrations/whatsapp`,
          icon: ChatBubbleLeftRightIcon,
          color: 'emerald',
          status: 'Ready'
        },
        {
          name: 'Instagram Direct',
          description: 'Manage DMs and story replies directly from your inbox.',
          href: `/account/${workspaceSlug}/integrations/instagram`,
          icon: CameraIcon,
          color: 'pink',
          status: 'Ready'
        },
        {
          name: 'Email Inbox',
          description: 'Inbound email relay for a unified communication experience.',
          href: `/account/${workspaceSlug}/integrations/email`,
          icon: AtSymbolIcon,
          color: 'zinc',
          status: 'Active'
        },
        {
          name: 'Gmail Sync',
          description: 'Synchronize your Google Workspace emails and contacts.',
          href: `/account/${workspaceSlug}/integrations/gmail`,
          icon: EnvelopeIcon,
          color: 'red',
          status: 'OAuth'
        }
      ]
    },
    {
      id: 'productivity',
      name: 'Productivity & Automation',
      description: 'Automate your workflows and sync your schedules.',
      items: [
        {
          name: 'Google Calendar',
          description: 'Sync meetings and availability with your CRM pipeline.',
          href: `/account/${workspaceSlug}/integrations/calendar`,
          icon: CalendarIcon,
          color: 'blue',
          status: 'Ready'
        },
        {
          name: 'Zapier',
          description: 'Connect with 5000+ apps and automate repetitive tasks.',
          href: `/account/${workspaceSlug}/integrations/zapier`,
          icon: BoltIcon,
          color: 'orange',
          status: 'Webhook'
        }
      ]
    },
    {
      id: 'developer',
      name: 'Developer Tools',
      description: 'technical tools for developers and advanced implementations.',
      items: [
        {
          name: 'Webhooks',
          description: 'Real-time event notifications for external systems.',
          href: `/account/${workspaceSlug}/integrations/webhooks`,
          icon: GlobeAltIcon,
          color: 'indigo',
          status: 'Advanced'
        },
        {
          name: 'API Keys',
          description: 'Secure access to your data via our RESTful API.',
          href: `/account/${workspaceSlug}/integrations/api-keys`,
          icon: KeyIcon,
          color: 'zinc',
          status: 'Secure'
        }
      ]
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AccountLayout>
      <div className="py-12 bg-[#fdfdfe] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-zinc-950 rounded-[14px] flex items-center justify-center shadow-glow-zinc/20">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Ecosystem</span>
          </div>
          <h1 className="text-4xl font-executive font-extrabold text-zinc-950 tracking-tighter leading-none mb-4">
            {t('common.label.integrations')}
          </h1>
          <p className="text-zinc-500 font-medium text-lg max-w-2xl leading-relaxed text-balance">
            {t('integrations.subtitle')} Use our official connectors to build a powerful omnichannel environment.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-6 space-y-20">
          {categories.map((category) => (
            <section key={category.id}>
              <div className="mb-8 ml-2">
                <h2 className="text-xl font-executive font-extrabold text-zinc-900 tracking-tight leading-none mb-2">{category.name}</h2>
                <p className="text-sm text-zinc-400 font-medium">{category.description}</p>
              </div>

              <motion.ul 
                variants={container}
                initial="hidden"
                animate="show"
                role="list" 
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {category.items.map((item) => (
                  <motion.li key={item.name} variants={itemAnim}>
                    <Link href={item.href} className="group block h-full">
                      <div className="h-full bg-white rounded-[32px] p-8 border border-zinc-100 shadow-premium-sm hover:shadow-premium transition-all duration-500 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${item.color}-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-60 transition-opacity duration-700`} />
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-14 h-14 rounded-[20px] bg-${item.color}-50 flex items-center justify-center border border-${item.color}-100 group-hover:scale-110 transition-transform duration-500`}>
                              <item.icon className={`w-7 h-7 text-${item.color}-500`} />
                            </div>
                            <div className="px-3 py-1 bg-zinc-50 rounded-full border border-zinc-100 group-hover:bg-white transition-colors">
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none block">
                                {item.status}
                              </span>
                            </div>
                          </div>

                          <div className="mb-8">
                            <h3 className="text-lg font-executive font-extrabold text-zinc-900 tracking-tight leading-none mb-2 group-hover:text-zinc-950">
                              {item.name}
                            </h3>
                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="mt-auto flex items-center gap-2 pt-6 border-t border-zinc-50 group-hover:border-zinc-100 transition-colors">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-950 transition-colors">
                              {t('common.action.configure')}
                            </span>
                            <ArrowRightIcon className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-950 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </section>
          ))}
        </div>
      </div>
    </AccountLayout>
  );
};

export default Integrations;
