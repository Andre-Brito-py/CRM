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
      <div className="py-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-12 h-12 bg-indigo-600 rounded-[18px] flex items-center justify-center shadow-glow-indigo/20">
              <BoltIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Marketplace & Sync</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-6"
          >
            {t('common.label.integrations')} <span className="text-indigo-600">Ecosystem</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 font-medium text-xl max-w-2xl leading-relaxed italic"
          >
            {t('integrations.subtitle')} Expand your CRM capabilities with official, high-performance connectors.
          </motion.p>
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
                {category.items.map((item, idx) => (
                  <motion.li key={item.name} variants={itemAnim}>
                    <Link href={item.href} className="group block h-full">
                      <div className="h-full vysify-glass p-8 rounded-[2.5rem] hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-700 hover:-translate-y-2 border border-zinc-100/50 dark:border-zinc-800/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-indigo-500/10 transition-colors duration-700" />
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-8">
                            <div className="w-16 h-16 rounded-[22px] bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-premium-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                              <item.icon className="w-8 h-8 text-zinc-900 dark:text-white" />
                            </div>
                            <div className="px-3 py-1.5 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100/50 dark:border-zinc-700/50 backdrop-blur-sm">
                              <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none block">
                                {item.status}
                              </span>
                            </div>
                          </div>
 
                          <div className="mb-8">
                            <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none mb-3 group-hover:text-indigo-600 transition-colors italic uppercase">
                              {item.name}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed italic">
                              {item.description}
                            </p>
                          </div>
 
                          <div className="mt-auto flex items-center gap-3 pt-6 border-t border-zinc-50 dark:border-zinc-800/50 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30 transition-colors">
                            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] italic group-hover:text-indigo-600 transition-colors">
                              {t('common.action.configure')}
                            </span>
                            <ArrowRightIcon className="w-4 h-4 text-zinc-300 group-hover:text-indigo-600 group-hover:translate-x-1.5 transition-all" />
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
