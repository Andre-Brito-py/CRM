import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';
import {
  TrashIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import Meta from '@/components/Meta/index';

const CATALOG = [
  {
    title: 'Pagamentos (Assinatura da plataforma)',
    items: [
      { key: 'PAYMENTS_SECRET_KEY', category: 'PAYMENT', label: 'Stripe Secret Key', secret: true },
      { key: 'STRIPE_PUBLISHABLE_KEY', category: 'PAYMENT', label: 'Stripe Publishable Key', secret: false, public: true },
      { key: 'STRIPE_WEBHOOK_SECRET', category: 'PAYMENT', label: 'Stripe Webhook Secret', secret: true },
      { key: 'PAYMENTS_SIGNING_SECRET', category: 'PAYMENT', label: 'Stripe Signing Secret (fallback)', secret: true },
    ],
  },
  {
    title: 'IA',
    items: [{ key: 'OPENAI_API_KEY', category: 'AI', label: 'OpenAI API Key', secret: true }],
  },
  {
    title: 'Email',
    items: [
      { key: 'EMAIL_FROM', category: 'EMAIL', label: 'Email From', secret: false },
      { key: 'EMAIL_SERVICE', category: 'EMAIL', label: 'Email Service', secret: false },
      { key: 'EMAIL_SERVER_USER', category: 'EMAIL', label: 'SMTP User', secret: false },
      { key: 'EMAIL_SERVER_PASSWORD', category: 'EMAIL', label: 'SMTP Password', secret: true },
    ],
  },
  {
    title: 'Domínios (Vercel)',
    items: [
      { key: 'VERCEL_API_URL', category: 'INTEGRATIONS', label: 'Vercel API URL', secret: false },
      { key: 'VERCEL_PROJECT_ID', category: 'INTEGRATIONS', label: 'Vercel Project ID', secret: false },
      { key: 'VERCEL_TEAM_ID', category: 'INTEGRATIONS', label: 'Vercel Team ID', secret: false },
      { key: 'VERCEL_AUTH_BEARER_TOKEN', category: 'INTEGRATIONS', label: 'Vercel Auth Token', secret: true },
      { key: 'VERCEL_IP_ADDRESS', category: 'INTEGRATIONS', label: 'Vercel IP (apex)', secret: false, public: true },
    ],
  },
  {
    title: 'Storage (S3)',
    items: [
      { key: 'AWS_S3_ACCESS_KEY_ID', category: 'INTEGRATIONS', label: 'S3 Access Key ID', secret: true },
      { key: 'AWS_S3_SECRET_ACCESS_KEY', category: 'INTEGRATIONS', label: 'S3 Secret Access Key', secret: true },
      { key: 'AWS_S3_REGION', category: 'INTEGRATIONS', label: 'S3 Region', secret: false },
      { key: 'AWS_S3_BUCKET_NAME', category: 'INTEGRATIONS', label: 'S3 Bucket Name', secret: false },
    ],
  },
  {
    title: 'Web Push',
    items: [
      { key: 'WEB_PUSH_EMAIL', category: 'INTEGRATIONS', label: 'Web Push Email', secret: false },
      { key: 'VAPID_PUBLIC_KEY', category: 'INTEGRATIONS', label: 'VAPID Public Key', secret: false, public: true },
      { key: 'VAPID_PRIVATE_KEY', category: 'INTEGRATIONS', label: 'VAPID Private Key', secret: true },
    ],
  },
  {
    title: 'Webhooks (Asaas)',
    items: [
      { key: 'ASAAS_API_KEY', category: 'INTEGRATIONS', label: 'Asaas API Key', secret: true },
      { key: 'ASAAS_ENV', category: 'INTEGRATIONS', label: 'Asaas Environment', secret: false },
      { key: 'ASAAS_WEBHOOK_TOKEN', category: 'INTEGRATIONS', label: 'Asaas Webhook Token', secret: true },
      { key: 'ASAAS_USER_AGENT', category: 'INTEGRATIONS', label: 'Asaas User-Agent', secret: false },
    ],
  },
  {
    title: 'Jobs (cron)',
    items: [{ key: 'CRON_SECRET', category: 'INTEGRATIONS', label: 'Cron Secret', secret: true }],
  },
  {
    title: 'Analytics',
    items: [{ key: 'GOOGLE_ANALYTICS_ID', category: 'INTEGRATIONS', label: 'Google Analytics ID', secret: false, public: true }],
  },
  {
    title: 'Geral',
    items: [{ key: 'APP_URL', category: 'GENERAL', label: 'App URL', secret: false }],
  },
];

const getConfigStatus = (config, def) => {
  if (!def?.secret) {
    const value = config?.value ?? '';
    return { isSet: String(value).trim().length > 0, isSecret: false };
  }
  if (!config) return { isSet: false, isSecret: true };
  if (typeof config.isSet === 'boolean') return { isSet: config.isSet, isSecret: true };
  return { isSet: true, isSecret: true };
};

const AdminSettings = () => {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR(
    session ? '/api/admin/settings' : null,
    fetcher
  );

  const [values, setValues] = useState({});
  const [isSavingKey, setIsSavingKey] = useState({});
  const [showValue, setShowValue] = useState({});

  const configs = data?.data?.configs || [];
  const configsByKey = useMemo(() => {
    const map = new Map();
    for (const c of configs) map.set(String(c.key || '').toUpperCase(), c);
    return map;
  }, [configs]);

  useEffect(() => {
    const next = {};
    for (const section of CATALOG) {
      for (const item of section.items) {
        const existing = configsByKey.get(item.key);
        if (!item.secret) {
          if (existing && typeof existing.value === 'string') next[item.key] = existing.value;
          else next[item.key] = '';
        } else {
          next[item.key] = '';
        }
      }
    }
    setValues((prev) => ({ ...next, ...prev }));
  }, [configsByKey]);

  const setKeyValue = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const toggleKeyVisibility = (key) => setShowValue((prev) => ({ ...prev, [key]: !prev[key] }));

  const saveKey = async ({ key, category, value, secret }) => {
    setIsSavingKey((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, category, value }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Configuração salva');
        mutate('/api/admin/settings');
        if (secret) setKeyValue(key, '');
      } else {
        toast.error(result?.error?.msg || 'Falha ao salvar configuração');
      }
    } catch (error) {
      toast.error('Falha ao salvar configuração');
    } finally {
      setIsSavingKey((prev) => ({ ...prev, [key]: false }));
    }
  };

  const clearKey = async ({ key }) => {
    setIsSavingKey((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, clear: true }),
      });

      if (response.ok) {
        toast.success('Configuração removida');
        mutate('/api/admin/settings');
      } else {
        const result = await response.json();
        toast.error(result?.error?.msg || 'Falha ao remover configuração');
      }
    } catch (error) {
      toast.error('Falha ao remover configuração');
    } finally {
      setIsSavingKey((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <AdminLayout>
      <Meta title="Nextacular - Admin Settings" />
      <Content.Title
        title="Configurações de API"
        subtitle="Chaves e integrações em runtime (sem re-deploy)"
      />
      <Content.Divider />

      <Content.Container>
        <div className="space-y-6">
          {CATALOG.map((section) => (
            <Card key={section.title}>
              <Card.Body title={section.title} subtitle="Salva no banco e aplica em runtime">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.items.map((item) => {
                    const config = configsByKey.get(item.key);
                    const status = getConfigStatus(config, item);
                    const currentValue = values[item.key] ?? '';
                    const inputType = item.secret ? (showValue[item.key] ? 'text' : 'password') : 'text';
                    const canClear = Boolean(config);
                    const saving = Boolean(isSavingKey[item.key]);

                    return (
                      <div key={item.key} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                            <div className="text-xs text-gray-500 font-mono">{item.key}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                'px-2 py-1 rounded-full text-xs font-semibold',
                                status.isSet ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                              ].join(' ')}
                            >
                              {status.isSet ? 'Configurado' : 'Pendente'}
                            </span>
                            {item.public ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                Public
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700">Valor</label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type={inputType}
                              className="flex-1 rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                              value={currentValue}
                              onChange={(e) => setKeyValue(item.key, e.target.value)}
                              placeholder={item.secret ? '••••••••••' : ''}
                              autoComplete={item.secret ? 'new-password' : 'off'}
                              disabled={isLoading}
                            />
                            {item.secret ? (
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility(item.key)}
                                className="p-2 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                              >
                                {showValue[item.key] ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </button>
                            ) : null}
                          </div>
                          {item.secret ? (
                            <div className="mt-1 text-xs text-gray-500">
                              Para manter o valor atual, deixe em branco.
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Categoria: <span className="font-semibold">{item.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {canClear ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => clearKey({ key: item.key })}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                                Remover
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={saving || isLoading}
                              onClick={() =>
                                saveKey({
                                  key: item.key,
                                  category: item.category,
                                  value: currentValue,
                                  secret: item.secret,
                                })
                              }
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              <KeyIcon className="h-4 w-4" />
                              {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card.Body>
            </Card>
          ))}

          <Card>
            <Card.Body
              title="Gateways do CRM"
              subtitle="Credenciais por gateway + ambiente (sandbox/prod) ficam no Finance"
            >
              <div className="text-sm text-gray-700">
                As credenciais de gateways (Asaas/Mercado Pago/Pagar.me/Stripe do CRM) são gerenciadas em <span className="font-semibold">Finance / Payment Providers</span>.
              </div>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>
    </AdminLayout>
  );
};

export default AdminSettings;
