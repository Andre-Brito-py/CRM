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
      { key: 'STRIPE_AUTOMATIC_TAX', category: 'PAYMENT', label: 'Stripe Automatic Tax (true/false)', secret: false },
      { key: 'STRIPE_TAX_ID_COLLECTION', category: 'PAYMENT', label: 'Stripe Tax ID Collection (true/false)', secret: false },
      { key: 'STRIPE_BILLING_ADDRESS_COLLECTION', category: 'PAYMENT', label: 'Stripe Billing Address (auto/required)', secret: false },
      { key: 'STRIPE_BILLING_PORTAL_CONFIGURATION_ID', category: 'PAYMENT', label: 'Stripe Billing Portal Configuration ID', secret: false },
      { key: 'PAYMENTS_REQUIRE_CARD_ON_SIGNUP', category: 'PAYMENT', label: 'Exigir cartão no cadastro (true/false)', secret: false },
      { key: 'STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES', category: 'PAYMENT', label: 'Stripe Checkout payment_method_types (csv)', secret: false },
    ],
  },
  {
    title: 'Nota Fiscal (NFS-e)',
    items: [
      { key: 'NFSE_ENABLED', category: 'FISCAL', label: 'Habilitar emissão (true/false)', secret: false },
      { key: 'FOCUS_NFE_API_KEY', category: 'FISCAL', label: 'Focus NFe API Key', secret: true },
      { key: 'FOCUSNFE_TOKEN', category: 'FISCAL', label: 'Focus NFe token (legacy)', secret: true },
      { key: 'FOCUS_NFE_ENVIRONMENT', category: 'FISCAL', label: 'Focus NFe Environment (homologacao/producao)', secret: false },
      { key: 'FOCUS_NFE_NFSE_ENDPOINT', category: 'FISCAL', label: 'Focus NFe endpoint (nfse/nfsen)', secret: false },
      { key: 'NFSE_CODIGO_TRIBUTACAO_NACIONAL_ISS', category: 'FISCAL', label: 'Código Tributação Nacional ISS', secret: false },
      { key: 'NFSE_CODIGO_NBS', category: 'FISCAL', label: 'Código NBS', secret: false },
      { key: 'NFSE_ISSUERS_JSON', category: 'FISCAL', label: 'Emitentes (JSON)', secret: false },
      { key: 'NFSE_ISSUER_CODE', category: 'FISCAL', label: 'Emitente padrão: código', secret: false },
      { key: 'NFSE_ISSUER_NAME', category: 'FISCAL', label: 'Emitente padrão: nome', secret: false },
      { key: 'NFSE_ISSUER_CNPJ', category: 'FISCAL', label: 'Emitente padrão: CNPJ', secret: false },
      { key: 'NFSE_ISSUER_IS_DEFAULT', category: 'FISCAL', label: 'Emitente padrão (true/false)', secret: false },
    ],
  },
  {
    title: 'IA',
    items: [
      { key: 'PRIMARY_AI_PROVIDER', category: 'AI', label: 'Provedor Principal (GEMINI ou OPENAI)', secret: false, public: false },
      { key: 'OPENAI_API_KEY', category: 'AI', label: 'OpenAI API Key', secret: true },
      { key: 'GOOGLE_AI_API_KEY', category: 'AI', label: 'Google AI API Key (Gemini)', secret: true },
      { key: 'AI_QUOTA_WARN_PERCENT', category: 'AI', label: 'Aviso de cota (percentual, ex: 80)', secret: false, public: false },
      { key: 'AI_OVERAGE_ENABLED', category: 'AI', label: 'Permitir overage (true/false)', secret: false, public: false },
      { key: 'AI_OVERAGE_REQUIRE_OPTIN', category: 'AI', label: 'Exigir opt-in do cliente (true/false)', secret: false, public: false },
      { key: 'AI_OVERAGE_PRICE_PER_1M_TOKENS', category: 'AI', label: 'Preço do overage (por 1M tokens, ex: 4.00)', secret: false, public: false },
      { key: 'AI_OVERAGE_MAX_TOKENS_24H', category: 'AI', label: 'Teto do overage (tokens/24h, ex: 200000)', secret: false, public: false },
    ],
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
    title: 'Google (OAuth)',
    items: [
      { key: 'GOOGLE_CLIENT_ID', category: 'INTEGRATIONS', label: 'Google Client ID', secret: false },
      { key: 'GOOGLE_CLIENT_SECRET', category: 'INTEGRATIONS', label: 'Google Client Secret', secret: true },
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
    title: 'Zapier',
    items: [
      { key: 'ZAPIER_ENABLED', category: 'INTEGRATIONS', label: 'Zapier habilitado (true/false)', secret: false },
      { key: 'ZAPIER_ALLOWED_HOSTS', category: 'INTEGRATIONS', label: 'Hosts permitidos (CSV, ex: hooks.zapier.com)', secret: false },
    ],
  },
  {
    title: 'Jobs (cron)',
    items: [
      { key: 'CRON_SECRET', category: 'INTEGRATIONS', label: 'Cron Secret', secret: true },
      { key: 'MEDIA_RETENTION_DAYS', category: 'INTEGRATIONS', label: 'Retenção de mídia (dias, ex: 30)', secret: false },
      { key: 'MEDIA_RETENTION_BATCH', category: 'INTEGRATIONS', label: 'Retenção de mídia (lote, ex: 1000)', secret: false },
    ],
  },
  {
    title: 'Analytics',
    items: [{ key: 'GOOGLE_ANALYTICS_ID', category: 'INTEGRATIONS', label: 'Google Analytics ID', secret: false, public: true }],
  },
  {
    title: 'FinOps',
    items: [
      { key: 'FINOPS_UNIT_COST_WHATSAPP_OUTBOUND', category: 'FINOPS', label: 'Custo unitário WhatsApp outbound', secret: false },
      { key: 'FINOPS_UNIT_COST_AI_REQUEST', category: 'FINOPS', label: 'Custo unitário IA request', secret: false },
      { key: 'FINOPS_UNIT_COST_UPLOAD_REQUEST', category: 'FINOPS', label: 'Custo unitário upload request', secret: false },
      { key: 'DEFAULT_WORKSPACE_PAYMENT_PROVIDER', category: 'FINOPS', label: 'Gateway padrão do CRM (ex: asaas)', secret: false },
      { key: 'PLATFORM_FEE_PERCENTAGE', category: 'FINOPS', label: 'Fee da plataforma (percentual)', secret: false },
      { key: 'PLATFORM_FEE_FIXED', category: 'FINOPS', label: 'Fee da plataforma (fixo)', secret: false },
      { key: 'PAYMENT_WHATSAPP_MESSAGE_TEMPLATE', category: 'FINOPS', label: 'Template WhatsApp (cobrança)', secret: false },
    ],
  },
  {
    title: 'Manutenção',
    items: [
      { key: 'MAINTENANCE_ENABLED', category: 'GENERAL', label: 'Sistema em manutenção (true/false)', secret: false, public: true },
      { key: 'MAINTENANCE_MESSAGE', category: 'GENERAL', label: 'Mensagem para usuários', secret: false, public: true },
      { key: 'MAINTENANCE_EXPECTED_AT', category: 'GENERAL', label: 'Previsão de retorno (ISO: 2026-03-14T23:00:00Z)', secret: false, public: true },
    ],
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
  const { data: issuersData, mutate: mutateIssuers } = useSWR(
    session ? '/api/admin/fiscal/issuers' : null,
    fetcher
  );

  const [values, setValues] = useState({});
  const [isSavingKey, setIsSavingKey] = useState({});
  const [showValue, setShowValue] = useState({});
  const [stripeValidationEnabled, setStripeValidationEnabled] = useState(false);
  const [isPortalSettingUp, setIsPortalSettingUp] = useState(false);
  const [portalSetupResult, setPortalSetupResult] = useState(null);
  const [isSuperAdminBillingOpening, setIsSuperAdminBillingOpening] = useState(false);
  const [stripeReplaySubmitting, setStripeReplaySubmitting] = useState(false);
  const [stripeReplayResult, setStripeReplayResult] = useState(null);
  const [stripeReplayEventId, setStripeReplayEventId] = useState('');
  const [issuerModalOpen, setIssuerModalOpen] = useState(false);
  const [issuerSubmitting, setIssuerSubmitting] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState(null);
  const [issuerForm, setIssuerForm] = useState({
    code: '',
    name: '',
    cnpjPrestador: '',
    inscricaoMunicipalPrestador: '',
    codigoMunicipioEmissora: '',
    codigoMunicipioPrestacao: '',
    codigoOpcaoSimplesNacional: '',
    regimeEspecialTributacao: '',
    isDefault: false,
  });

  const {
    data: stripeValidation,
    error: stripeValidationError,
    isLoading: stripeValidationLoading,
    mutate: mutateStripeValidation,
  } = useSWR(
    stripeValidationEnabled && session ? '/api/admin/stripe/validate' : null,
    fetcher
  );

  const setupBillingPortal = async () => {
    setIsPortalSettingUp(true);
    setPortalSetupResult(null);
    try {
      const response = await fetch('/api/admin/stripe/billing-portal-setup', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.errors?.error?.msg || 'Falha ao configurar Billing Portal');
        return;
      }
      setPortalSetupResult(result?.data || null);
      toast.success('Billing Portal configurado');
      mutate('/api/admin/settings');
      setStripeValidationEnabled(true);
      mutateStripeValidation();
    } catch (error) {
      toast.error('Falha ao configurar Billing Portal');
    } finally {
      setIsPortalSettingUp(false);
    }
  };

  const openSuperAdminBillingPortal = async () => {
    setIsSuperAdminBillingOpening(true);
    try {
      const response = await fetch('/api/payments/portal', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.errors?.error?.msg || result?.error?.msg || 'Falha ao abrir Billing Portal');
        return;
      }
      const url = result?.data?.url || null;
      if (!url) {
        toast.error('Billing Portal indisponível');
        return;
      }
      window.location.href = url;
    } catch {
      toast.error('Falha ao abrir Billing Portal');
    } finally {
      setIsSuperAdminBillingOpening(false);
    }
  };

  const replayStripeEvent = async ({ eventId, times = 2 }) => {
    setStripeReplaySubmitting(true);
    setStripeReplayResult(null);
    try {
      const response = await fetch('/api/admin/stripe/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, times }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.errors?.error?.msg || 'Falha ao reenviar evento');
        return;
      }
      setStripeReplayResult(result?.data?.replay || null);
      if (result?.data?.replay?.duplicatesDetected) {
        toast.error('Duplicação detectada no replay');
      } else {
        toast.success('Replay executado (sem duplicação)');
      }
      mutateStripeValidation();
    } catch (error) {
      toast.error('Falha ao reenviar evento');
    } finally {
      setStripeReplaySubmitting(false);
    }
  };

  const configs = data?.data?.configs;
  const issuers = issuersData?.data?.issuers || [];
  const configsByKey = useMemo(() => {
    const map = new Map();
    for (const c of Array.isArray(configs) ? configs : []) map.set(String(c.key || '').toUpperCase(), c);
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

  const openCreateIssuer = () => {
    setSelectedIssuer(null);
    setIssuerForm({
      code: '',
      name: '',
      cnpjPrestador: '',
      inscricaoMunicipalPrestador: '',
      codigoMunicipioEmissora: '',
      codigoMunicipioPrestacao: '',
      codigoOpcaoSimplesNacional: '',
      regimeEspecialTributacao: '',
      isDefault: issuers.length === 0,
    });
    setIssuerModalOpen(true);
  };

  const openEditIssuer = (issuer) => {
    setSelectedIssuer(issuer);
    setIssuerForm({
      code: issuer?.code || '',
      name: issuer?.name || '',
      cnpjPrestador: issuer?.cnpjPrestador || '',
      inscricaoMunicipalPrestador: issuer?.inscricaoMunicipalPrestador || '',
      codigoMunicipioEmissora: issuer?.codigoMunicipioEmissora ? String(issuer.codigoMunicipioEmissora) : '',
      codigoMunicipioPrestacao: issuer?.codigoMunicipioPrestacao ? String(issuer.codigoMunicipioPrestacao) : '',
      codigoOpcaoSimplesNacional: issuer?.codigoOpcaoSimplesNacional ? String(issuer.codigoOpcaoSimplesNacional) : '',
      regimeEspecialTributacao: issuer?.regimeEspecialTributacao ? String(issuer.regimeEspecialTributacao) : '',
      isDefault: Boolean(issuer?.isDefault),
    });
    setIssuerModalOpen(true);
  };

  const saveIssuer = async () => {
    setIssuerSubmitting(true);
    try {
      const url = selectedIssuer ? `/api/admin/fiscal/issuers/${selectedIssuer.id}` : '/api/admin/fiscal/issuers';
      const method = selectedIssuer ? 'PUT' : 'POST';
      const payload = {
        code: issuerForm.code,
        name: issuerForm.name,
        cnpjPrestador: issuerForm.cnpjPrestador,
        inscricaoMunicipalPrestador: issuerForm.inscricaoMunicipalPrestador,
        codigoMunicipioEmissora: issuerForm.codigoMunicipioEmissora,
        codigoMunicipioPrestacao: issuerForm.codigoMunicipioPrestacao,
        codigoOpcaoSimplesNacional: issuerForm.codigoOpcaoSimplesNacional,
        regimeEspecialTributacao: issuerForm.regimeEspecialTributacao,
        isDefault: issuerForm.isDefault,
      };
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        const errors = result?.errors || null;
        if (errors) {
          Object.keys(errors).forEach((k) => toast.error(errors[k]?.msg || 'Falha ao salvar emitente'));
          return;
        }
        toast.error(result?.error?.msg || 'Falha ao salvar emitente');
        return;
      }
      toast.success('Emitente salvo');
      setIssuerModalOpen(false);
      mutateIssuers();
    } catch (error) {
      toast.error('Falha ao salvar emitente');
    } finally {
      setIssuerSubmitting(false);
    }
  };

  const deleteIssuer = async (issuer) => {
    if (!confirm('Deseja remover este emitente?')) return;
    try {
      const response = await fetch(`/api/admin/fiscal/issuers/${issuer.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.error?.msg || 'Falha ao remover emitente');
        return;
      }
      toast.success('Emitente removido');
      mutateIssuers();
    } catch {
      toast.error('Falha ao remover emitente');
    }
  };

  return (
    <AdminLayout>
      <Meta title="Vysify - Admin Settings" />
      <Content.Title
        title="Configurações de API"
        subtitle="Chaves e integrações em runtime (sem re-deploy)"
      />
      <Content.Divider />

      <Content.Container>
        <div className="space-y-6">
          <Card>
            <Card.Body
              title="Cobrança do Super Admin"
              subtitle="Gerencie o cartão do Super Admin para custos de uso (overage)"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700">
                  O Super Admin paga o próprio consumo quando ele é o dono do workspace que gerou o uso.
                </div>
                <button
                  type="button"
                  disabled={isSuperAdminBillingOpening}
                  onClick={openSuperAdminBillingPortal}
                  className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSuperAdminBillingOpening ? 'Abrindo...' : 'Gerenciar cartão'}
                </button>
              </div>
            </Card.Body>
          </Card>
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
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                                Public
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700">Valor</label>
                          <div className="mt-1 flex items-center gap-2">
                            {item.key === 'PRIMARY_AI_PROVIDER' ? (
                              <select
                                className="flex-1 rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                                value={currentValue}
                                onChange={(e) => setKeyValue(item.key, e.target.value)}
                                disabled={isLoading}
                              >
                                <option value="">Automático (Gemini Padrão)</option>
                                <option value="GEMINI">Google Gemini</option>
                                <option value="OPENAI">OpenAI</option>
                              </select>
                            ) : (
                              <input
                                type={inputType}
                                className="flex-1 rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                                value={currentValue}
                                onChange={(e) => setKeyValue(item.key, e.target.value)}
                                placeholder={item.secret ? '••••••••••' : ''}
                                autoComplete={item.secret ? 'new-password' : 'off'}
                                disabled={isLoading}
                              />
                            )}
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
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
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

          <Card>
            <Card.Body
              title="Stripe (venda)"
              subtitle="Verificação automatizada de configuração e planos"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700">
                  Valida chaves, modo (live/test), webhook secret e consistência de preços/plano.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    disabled={isPortalSettingUp}
                    onClick={setupBillingPortal}
                    className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {isPortalSettingUp ? 'Configurando...' : 'Configurar Billing Portal'}
                  </button>
                  <button
                    type="button"
                    disabled={stripeValidationLoading}
                    onClick={() => {
                      setStripeValidationEnabled(true);
                      mutateStripeValidation();
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {stripeValidationLoading ? 'Validando...' : 'Validar Stripe'}
                  </button>
                </div>
              </div>

              {stripeValidationError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Falha ao validar Stripe.
                </div>
              ) : null}

              {portalSetupResult ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="text-sm font-semibold text-emerald-900">
                    Billing Portal pronto
                  </div>
                  <div className="mt-1 text-xs text-emerald-900 font-mono break-all">
                    {portalSetupResult.configurationId}
                  </div>
                  {portalSetupResult.dashboardUrl ? (
                    <a
                      className="mt-2 inline-flex text-sm font-semibold text-emerald-900 underline"
                      href={portalSetupResult.dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir no Stripe Dashboard
                    </a>
                  ) : null}
                </div>
              ) : null}

              {stripeValidation?.data ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Modo
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {stripeValidation?.data?.stripe?.livemode ? 'LIVE' : 'TEST'}
                      </div>
                    </div>
                    <div className="rounded-lg border px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Webhook
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {stripeValidation?.data?.webhook?.secretSelfTest ? 'Secret OK' : 'Secret inválido/ausente'}
                      </div>
                      {stripeValidation?.data?.webhook?.endpoint ? (
                        <div className="mt-1 text-xs text-gray-500 font-mono break-all">
                          {stripeValidation.data.webhook.endpoint}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {Array.isArray(stripeValidation?.data?.blockingIssues) &&
                    stripeValidation.data.blockingIssues.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="text-sm font-semibold text-amber-900">
                        Pendências bloqueantes
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                        {stripeValidation.data.blockingIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      Nenhuma pendência bloqueante detectada.
                    </div>
                  )}

                  {Array.isArray(stripeValidation?.data?.plans) &&
                    stripeValidation.data.plans.length > 0 ? (
                    <div className="rounded-lg border px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        Planos
                      </div>
                      <div className="mt-3 space-y-2">
                        {stripeValidation.data.plans.map((plan) => (
                          <div key={`${plan.planId}-${plan.stripePriceId}`} className="rounded-md border px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">
                                {plan.slug}
                              </div>
                              <div
                                className={[
                                  'px-2 py-1 rounded-full text-xs font-semibold',
                                  plan.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                                ].join(' ')}
                              >
                                {plan.ok ? 'OK' : 'Falha'}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 font-mono break-all">
                              {plan.stripePriceId}
                            </div>
                            {Array.isArray(plan.issues) && plan.issues.length > 0 ? (
                              <div className="mt-2 text-xs text-red-700">
                                {plan.issues.join(', ')}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {stripeValidation?.data?.liveWebhookEvents ? (
                    <div className="rounded-lg border px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">Eventos LIVE (últimas 24h)</div>
                      <div className="mt-1 text-sm text-gray-700">
                        Total: {stripeValidation.data.liveWebhookEvents.last24hCount ?? '-'}
                      </div>
                      {Array.isArray(stripeValidation.data.liveWebhookEvents.missingRequired) &&
                        stripeValidation.data.liveWebhookEvents.missingRequired.length > 0 ? (
                        <div className="mt-2 text-sm text-amber-800">
                          Faltando (24h): {stripeValidation.data.liveWebhookEvents.missingRequired.join(', ')}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-emerald-800">OK: eventos obrigatórios detectados</div>
                      )}
                      {stripeValidation.data.liveWebhookEvents.statusLast24h ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {Object.entries(stripeValidation.data.liveWebhookEvents.statusLast24h).map(([k, v]) => (
                            <span key={k} className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {Array.isArray(stripeValidation.data.liveWebhookEvents.recent) &&
                        stripeValidation.data.liveWebhookEvents.recent.length > 0 ? (
                        <div className="mt-3 space-y-1">
                          {stripeValidation.data.liveWebhookEvents.recent.map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-3 rounded border px-2 py-1 text-xs">
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-gray-600 break-all">{e.type}</div>
                                <div className="mt-0.5 font-mono text-[10px] text-gray-400 break-all">
                                  {e.id}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-gray-700">
                                  {e.status}
                                </div>
                                <button
                                  type="button"
                                  disabled={stripeReplaySubmitting}
                                  onClick={() => replayStripeEvent({ eventId: e.id, times: 2 })}
                                  className="rounded-md border px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                >
                                  Replay 2x
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                        <div className="text-xs font-semibold text-gray-900">
                          Replay manual (idempotência)
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={stripeReplayEventId}
                            onChange={(e) => setStripeReplayEventId(e.target.value)}
                            placeholder="evt_..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono text-gray-800"
                          />
                          <button
                            type="button"
                            disabled={stripeReplaySubmitting || !stripeReplayEventId.trim()}
                            onClick={() => replayStripeEvent({ eventId: stripeReplayEventId.trim(), times: 2 })}
                            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {stripeReplaySubmitting ? 'Reenviando...' : 'Replay 2x'}
                          </button>
                        </div>
                        {stripeReplayResult ? (
                          <div className="mt-3 space-y-2 text-xs text-gray-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-gray-600">
                                {stripeReplayResult.event?.id}
                              </span>
                              <span
                                className={[
                                  'px-2 py-1 rounded-full text-[10px] font-semibold',
                                  stripeReplayResult.duplicatesDetected ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                                ].join(' ')}
                              >
                                {stripeReplayResult.duplicatesDetected ? 'Duplicação detectada' : 'Sem duplicação'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(stripeReplayResult.attempts) ? stripeReplayResult.attempts.map((a) => (
                                <span key={a.index} className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-gray-600">
                                  #{a.index}: {a.status}
                                </span>
                              )) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card.Body>
          </Card>

          <Card>
            <Card.Body
              title="Nota Fiscal (NFS-e)"
              subtitle="Emitentes por localidade (município/UF) + chaves"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700">
                  Configure um ou mais emitentes e marque um como padrão.
                </div>
                <button
                  type="button"
                  onClick={openCreateIssuer}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Adicionar emitente
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Código</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Nome</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Município (IBGE)</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">CNPJ</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Padrão</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {issuers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                          Nenhum emitente cadastrado
                        </td>
                      </tr>
                    ) : (
                      issuers.map((issuer) => (
                        <tr key={issuer.id}>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{issuer.code}</td>
                          <td className="px-4 py-2 text-gray-900">{issuer.name}</td>
                          <td className="px-4 py-2 text-gray-700">{issuer.codigoMunicipioEmissora}</td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{issuer.cnpjPrestador}</td>
                          <td className="px-4 py-2">
                            {issuer.isDefault ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Sim
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                Não
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditIssuer(issuer)}
                                className="rounded-md border px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteIssuer(issuer)}
                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {issuerModalOpen ? (
                <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedIssuer ? 'Editar emitente' : 'Novo emitente'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIssuerModalOpen(false)}
                      className="text-sm font-semibold text-gray-700 hover:underline"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Código</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={Boolean(selectedIssuer) || issuerSubmitting}
                        value={issuerForm.code}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, code: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Nome</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={issuerSubmitting}
                        value={issuerForm.name}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, name: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">CNPJ do prestador</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm font-mono"
                        disabled={issuerSubmitting}
                        value={issuerForm.cnpjPrestador}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, cnpjPrestador: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Inscrição municipal</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={issuerSubmitting}
                        value={issuerForm.inscricaoMunicipalPrestador}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, inscricaoMunicipalPrestador: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Código município emissora (IBGE)</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={issuerSubmitting}
                        value={issuerForm.codigoMunicipioEmissora}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, codigoMunicipioEmissora: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Código município prestação (IBGE)</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={issuerSubmitting}
                        value={issuerForm.codigoMunicipioPrestacao}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, codigoMunicipioPrestacao: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Opção Simples Nacional</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={issuerSubmitting}
                        value={issuerForm.codigoOpcaoSimplesNacional}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, codigoOpcaoSimplesNacional: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Regime especial tributação</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                        disabled={issuerSubmitting}
                        value={issuerForm.regimeEspecialTributacao}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, regimeEspecialTributacao: e.target.value }))}
                        type="text"
                      />
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <input
                        id="issuerDefault"
                        type="checkbox"
                        checked={issuerForm.isDefault}
                        disabled={issuerSubmitting}
                        onChange={(e) => setIssuerForm((p) => ({ ...p, isDefault: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="issuerDefault" className="text-sm text-gray-800">
                        Emitente padrão
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIssuerModalOpen(false)}
                      className="rounded-md border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
                      disabled={issuerSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveIssuer}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      disabled={issuerSubmitting}
                    >
                      {issuerSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : null}
            </Card.Body>
          </Card>
        </div>
      </Content.Container>
    </AdminLayout>
  );
};

export default AdminSettings;
