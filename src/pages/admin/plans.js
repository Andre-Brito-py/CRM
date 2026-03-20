import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import { formatCurrency } from '@/lib/common/currency';

// -----------------------------------------------------------------
// Módulos disponíveis no sistema (label legível + key interna)
// -----------------------------------------------------------------
const AVAILABLE_MODULES = [
  { key: 'inbox', label: 'Inbox / WhatsApp' },
  { key: 'pipeline', label: 'Pipeline (Kanban)' },
  { key: 'contacts', label: 'Contatos' },
  { key: 'companies', label: 'Empresas' },
  { key: 'deals', label: 'Negócios' },
  { key: 'tasks', label: 'Tarefas' },
  { key: 'automations', label: 'Automações' },
  { key: 'analytics', label: 'Analytics / Relatórios' },
  { key: 'nps', label: 'Satisfação do Cliente (NPS)' },
  { key: 'ai_assistant', label: 'Assistente de IA' },
  { key: 'email_marketing', label: 'Email Marketing' },
  { key: 'custom_fields', label: 'Campos Personalizados' },
  { key: 'templates', label: 'Templates de Mensagem' },
  { key: 'integrations', label: 'Integrações (Webhooks, APIs)' },
  { key: 'payments', label: 'Pagamentos / Cobranças' },
];

const DEFAULT_MODULES = {};
AVAILABLE_MODULES.forEach(m => { DEFAULT_MODULES[m.key] = true; });

const isTruthyValue = (value) => {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

// -----------------------------------------------------------------
// Modal de criação/edição de Plano
// -----------------------------------------------------------------
const PlanModal = ({ show, toggle, plan, onSave }) => {
  const existingModules = plan?.features?.allowedModules || DEFAULT_MODULES;
  const defaultAiTokens24h =
    plan?.features?.maxAiTokens24h ??
    (plan?.features?.maxAiRequests24h ? Number(plan.features.maxAiRequests24h) * 2500 : 30000);

  const initialFeatures = {
    isFreePlan:
      Boolean(plan?.features?.isFreePlan) ||
      String(plan?.slug || '').trim().toUpperCase() === 'FREE' ||
      Number(plan?.price || 0) === 0,
    maxUsers: plan?.features?.maxUsers ?? 5,
    maxPendingInvites:
      plan?.features?.maxPendingInvites ??
      (typeof plan?.features?.maxUsers === 'number'
        ? Math.max(20, plan.features.maxUsers * 5)
        : 50),
    maxContacts: plan?.features?.maxContacts ?? 1000,
    maxAutomations: plan?.features?.maxAutomations ?? 10,
    maxAiRequests24h: plan?.features?.maxAiRequests24h ?? 50,
    maxAiTokens24h: defaultAiTokens24h,
    maxUploads24h: plan?.features?.maxUploads24h ?? 30,
    freeTrialDays: plan?.features?.freeTrialDays ?? 0,
    isActive: plan ? plan.isActive : true,
  };

  const [formData, setFormData] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    prices: plan?.prices || (plan ? [] : [{ currency: 'USD', amount: 0, amountAnnual: null, stripePriceId: '', stripePriceIdAnnual: '' }]),
    ...initialFeatures,
  });

  const [allowedModules, setAllowedModules] = useState(() => {
    const m = {};
    AVAILABLE_MODULES.forEach(mod => {
      m[mod.key] = existingModules[mod.key] !== false;
    });
    return m;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePriceChange = (index, field, value) => {
    const newPrices = [...formData.prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setFormData({ ...formData, prices: newPrices });
  };

  const addPriceRow = () => {
    setFormData({
      ...formData,
      prices: [...formData.prices, { currency: 'USD', amount: 0, amountAnnual: null, stripePriceId: '', stripePriceIdAnnual: '' }]
    });
  };

  const removePriceRow = (index) => {
    const newPrices = formData.prices.filter((_, i) => i !== index);
    setFormData({ ...formData, prices: newPrices });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'isFreePlan' && checked) {
        newData.price = 0;
        newData.priceAnnual = '';
        newData.annualDiscount = '';
        newData.stripePriceId = '';
        newData.stripePriceIdAnnual = '';
        newData.freeTrialDays = 0;
      }

      // Auto-calculate annual price if monthly price or discount changes
      if (name === 'price' || name === 'annualDiscount') {
        const monthly = parseFloat(name === 'price' ? value : prev.price) || 0;
        const discount = parseFloat(name === 'annualDiscount' ? value : prev.annualDiscount) || 0;
        if (discount > 0) {
          newData.priceAnnual = (monthly * 12 * (1 - discount / 100)).toFixed(2);
        }
      }

      return newData;
    });
  };

  const toggleModule = (key) => {
    setAllowedModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (state) => {
    const m = {};
    AVAILABLE_MODULES.forEach(mod => { m[mod.key] = state; });
    setAllowedModules(m);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const normalizeLimit = (value, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        if (n <= 0) return null;
        return n;
      };

      const features = {
        isFreePlan: Boolean(formData.isFreePlan),
        maxUsers: normalizeLimit(formData.maxUsers, 5),
        maxPendingInvites: normalizeLimit(formData.maxPendingInvites, 50),
        maxContacts: Number(formData.maxContacts) || 1000,
        maxAutomations: Number(formData.maxAutomations) || 10,
        maxAiRequests24h: Number(formData.maxAiRequests24h) || 50,
        maxAiTokens24h: Number(formData.maxAiTokens24h) || 30000,
        maxUploads24h: Number(formData.maxUploads24h) || 30,
        freeTrialDays: Number(formData.freeTrialDays) || 0,
        allowedModules,
      };

      const isFreePlan = Boolean(formData.isFreePlan);
      const normalizedPrice = isFreePlan ? 0 : parseFloat(formData.price);
      const normalizedPriceAnnual = isFreePlan
        ? null
        : (formData.priceAnnual ? parseFloat(formData.priceAnnual) : null);
      const normalizedAnnualDiscount = isFreePlan
        ? null
        : (formData.annualDiscount ? parseFloat(formData.annualDiscount) : null);

      await onSave({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        prices: isFreePlan ? [] : formData.prices.map(p => ({
          ...p,
          amount: parseFloat(p.amount || p.price || 0),
          amountAnnual: p.amountAnnual || p.priceAnnual ? parseFloat(p.amountAnnual || p.priceAnnual) : null,
        })),
        isActive: formData.isActive,
        features,
      });
      toggle();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledCount = Object.values(allowedModules).filter(Boolean).length;

  return (
    <Modal show={show} toggle={toggle} title={plan ? 'Edit Plan' : 'Create Plan'}>
      <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-2xl">
        {/* Básico */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input type="text" name="slug" required value={formData.slug} onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={2} value={formData.description} onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2" />
        </div>

        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-900">Preços por Moeda</h4>
            <button type="button" onClick={addPriceRow} disabled={Boolean(formData.isFreePlan)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-white px-2 py-1 rounded border border-brand-200 shadow-sm disabled:opacity-50">
              + Adicionar Moeda
            </button>
          </div>

          {!formData.isFreePlan && formData.prices.map((p, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Moeda</label>
                <select value={p.currency} onChange={(e) => handlePriceChange(idx, 'currency', e.target.value)}
                  className="block w-full rounded border-gray-300 text-sm p-1">
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Mensal</label>
                <input type="number" step="0.01" value={p.amount || p.price || 0} onChange={(e) => handlePriceChange(idx, 'amount', e.target.value)}
                  className="block w-full rounded border-gray-300 text-sm p-1" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Anual</label>
                <input type="number" step="0.01" value={p.amountAnnual || p.priceAnnual || ''} onChange={(e) => handlePriceChange(idx, 'amountAnnual', e.target.value)}
                  className="block w-full rounded border-gray-300 text-sm p-1" placeholder="Vazio" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 italic">Stripe Price ID (Opcional)</label>
                <input type="text" value={p.stripePriceId || ''} onChange={(e) => handlePriceChange(idx, 'stripePriceId', e.target.value)}
                  className="block w-full rounded border-gray-300 text-xs p-1 font-mono" placeholder="price_..." />
              </div>
              <div className="col-span-1 flex justify-center pb-1">
                <button type="button" onClick={() => removePriceRow(idx)} className="text-red-500 hover:text-red-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}

          {formData.isFreePlan && <p className="text-sm text-gray-500 italic">Planos gratuitos não possuem preços.</p>}
          {!formData.isFreePlan && formData.prices.length === 0 && <p className="text-sm text-red-500 italic">Adicione ao menos um preço para este plano.</p>}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-3">
            <input
              id="isFreePlan"
              name="isFreePlan"
              type="checkbox"
              checked={Boolean(formData.isFreePlan)}
              onChange={handleChange}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <label htmlFor="isFreePlan" className="block text-sm text-gray-900 font-medium">
              Marcar como plano Free
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Stripe Price ID (Monthly)</label>
            <input type="text" name="stripePriceId" value={formData.stripePriceId} onChange={handleChange}
              disabled={Boolean(formData.isFreePlan)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stripe Price ID (Annual)</label>
            <input type="text" name="stripePriceIdAnnual" value={formData.stripePriceIdAnnual} onChange={handleChange}
              disabled={Boolean(formData.isFreePlan)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2" />
          </div>
        </div>

        {/* Trial */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-amber-700">
                ⏳ Free Trial (days)
              </label>
              <p className="text-xs text-gray-500 mb-1">0 = sem trial. Após esse período, a cobrança inicia automaticamente (Stripe).</p>
              <input type="number" name="freeTrialDays" min="0" value={formData.freeTrialDays} onChange={handleChange}
                disabled={Boolean(formData.isFreePlan)}
                className="block w-full rounded-md border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-amber-700 font-bold bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed" />
            </div>
            <div className="flex items-center pt-6">
              <input id="isActiveCheck" name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded" />
              <label htmlFor="isActiveCheck" className="ml-2 block text-sm text-gray-900 font-medium">Active</label>
            </div>
          </div>
        </div>

        {/* Limites numéricos */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">📊 Limites Numéricos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: 'maxUsers', label: 'Max Users' },
              { name: 'maxPendingInvites', label: 'Max Pending Invites' },
              { name: 'maxContacts', label: 'Max Contacts' },
              { name: 'maxAutomations', label: 'Max Automations' },
              { name: 'maxAiRequests24h', label: 'Max IA Requests (24h)' },
              { name: 'maxAiTokens24h', label: 'Max IA Tokens (24h)' },
              { name: 'maxUploads24h', label: 'Max Uploads (24h)' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600">{label}</label>
                <input type="number" name={name} min="0" value={formData[name]} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm border p-1.5 text-brand-600 font-bold" />
              </div>
            ))}
          </div>
        </div>

        {/* Módulos habilitados */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">🧩 Módulos Disponíveis ({enabledCount}/{AVAILABLE_MODULES.length})</h4>
            <div className="flex gap-2">
              <button type="button" onClick={() => toggleAll(true)}
                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">
                All ON
              </button>
              <button type="button" onClick={() => toggleAll(false)}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium">
                All OFF
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_MODULES.map(mod => (
              <label key={mod.key}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${allowedModules[mod.key]
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}>
                <div
                  onClick={() => toggleModule(mod.key)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${allowedModules[mod.key] ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out mt-0.5 ${allowedModules[mod.key] ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                    }`} />
                </div>
                <span className={`text-sm font-medium ${allowedModules[mod.key] ? 'text-green-800' : 'text-gray-500'}`}>
                  {mod.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200">
          <Button type="button" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={toggle}>
            Cancel
          </Button>
          <Button type="submit" className="text-white bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// -----------------------------------------------------------------
// Página principal de Planos
// -----------------------------------------------------------------
const Plans = () => {
  const { data: session } = useSession();
  const { data, mutate } = useSWR(session ? '/api/admin/plans' : null, fetcher);
  const { data: settingsData, mutate: mutateSettings } = useSWR(
    session ? '/api/admin/settings' : null,
    fetcher
  );
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [plansShowFree, setPlansShowFree] = useState(true);
  const [landingPromoEnabled, setLandingPromoEnabled] = useState(false);
  const [landingPromoCode, setLandingPromoCode] = useState('');
  const [landingPromoText, setLandingPromoText] = useState('');
  const [savingLanding, setSavingLanding] = useState(false);

  const plans = data?.data?.plans || [];
  const isLoading = !data;

  useEffect(() => {
    const configs = settingsData?.data?.configs || [];
    const map = new Map(configs.map((c) => [String(c.key || '').toUpperCase(), c.value ?? '']));
    const showFreeRaw = map.get('PLANS_SHOW_FREE');
    const promoEnabledRaw = map.get('LANDING_PROMO_ENABLED');
    const promoCodeRaw = map.get('LANDING_PROMO_CODE');
    const promoTextRaw = map.get('LANDING_PROMO_TEXT');

    setPlansShowFree(showFreeRaw == null ? true : isTruthyValue(showFreeRaw));
    setLandingPromoEnabled(promoEnabledRaw == null ? false : isTruthyValue(promoEnabledRaw));
    setLandingPromoCode(String(promoCodeRaw || ''));
    setLandingPromoText(String(promoTextRaw || ''));
  }, [settingsData]);

  const saveLandingSettings = async () => {
    setSavingLanding(true);
    try {
      await api('/api/admin/settings', {
        method: 'POST',
        body: { key: 'PLANS_SHOW_FREE', value: plansShowFree ? 'true' : 'false', category: 'PLANS' },
      });
      await api('/api/admin/settings', {
        method: 'POST',
        body: { key: 'LANDING_PROMO_ENABLED', value: landingPromoEnabled ? 'true' : 'false', category: 'MARKETING' },
      });
      await api('/api/admin/settings', {
        method: 'POST',
        body: { key: 'LANDING_PROMO_CODE', value: String(landingPromoCode || '').trim(), category: 'MARKETING' },
      });
      await api('/api/admin/settings', {
        method: 'POST',
        body: { key: 'LANDING_PROMO_TEXT', value: String(landingPromoText || '').trim(), category: 'MARKETING' },
      });
      toast.success('Configurações atualizadas');
      mutateSettings();
    } catch (error) {
      toast.error('Falha ao salvar configurações');
    } finally {
      setSavingLanding(false);
    }
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setShowModal(true);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleDelete = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await api(`/api/admin/plans/${planId}`, { method: 'DELETE' });
      toast.success('Plan deleted successfully');
      mutate();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete plan');
    }
  };

  const handleSave = async (planData) => {
    if (selectedPlan) {
      await api(`/api/admin/plans/${selectedPlan.id}`, { method: 'PUT', body: planData });
      toast.success('Plan updated successfully');
    } else {
      await api('/api/admin/plans', { method: 'POST', body: planData });
      toast.success('Plan created successfully');
    }
    mutate();
  };

  const getModuleCount = (plan) => {
    const mods = plan?.features?.allowedModules;
    if (!mods) return AVAILABLE_MODULES.length;
    return Object.values(mods).filter(Boolean).length;
  };

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Subscription Plans</h1>
          <Button onClick={handleCreate} className="text-white bg-brand-600 hover:bg-brand-700 flex items-center">
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Plan
          </Button>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          <div className="bg-white shadow sm:rounded-md border border-gray-100 p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Landing Page</p>
                <p className="text-xs text-gray-500">Controle promoções e visibilidade do plano Free.</p>
              </div>
              <Button
                onClick={saveLandingSettings}
                className="text-white bg-zinc-900 hover:bg-zinc-800"
                disabled={savingLanding}
              >
                {savingLanding ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Plano Free</p>
                  <div className="flex items-center gap-2">
                    <input
                      id="plansShowFree"
                      type="checkbox"
                      checked={plansShowFree}
                      onChange={(e) => setPlansShowFree(e.target.checked)}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                    />
                    <label htmlFor="plansShowFree" className="text-sm text-gray-700">
                      Exibir na Landing
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se desativado, o Free não aparece na Landing e nem no cadastro.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Promoções</p>
                  <div className="flex items-center gap-2">
                    <input
                      id="landingPromoEnabled"
                      type="checkbox"
                      checked={landingPromoEnabled}
                      onChange={(e) => setLandingPromoEnabled(e.target.checked)}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                    />
                    <label htmlFor="landingPromoEnabled" className="text-sm text-gray-700">
                      Ativar
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Código (opcional)</label>
                    <input
                      type="text"
                      value={landingPromoCode}
                      onChange={(e) => setLandingPromoCode(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                      placeholder="Ex: VERAO20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Texto (opcional)</label>
                    <input
                      type="text"
                      value={landingPromoText}
                      onChange={(e) => setLandingPromoText(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                      placeholder="Ex: Ganhe 20% OFF no primeiro mês."
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <Link href="/admin/finance/coupons" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                      Gerenciar cupons e códigos
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No plans found. Create one to get started.</div>
            ) : (
              <ul role="list" className="divide-y divide-gray-200">
                {plans.map((plan) => {
                  const moduleCount = getModuleCount(plan);
                  const trialDays = plan?.features?.freeTrialDays || 0;

                  return (
                    <li key={plan.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-brand-600 truncate">{plan.name}</p>
                              <p className="text-sm text-gray-500">{plan.description || 'No description'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right space-y-1">
                              <div className="space-y-1">
                                {(plan.prices && plan.prices.length > 0) ? plan.prices.map((p, pIdx) => (
                                  <p key={pIdx} className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1 last:border-0">
                                    {formatCurrency(p.amount, p.currency, 'pt-BR')}
                                    <span className="text-gray-500 font-normal"> / mo</span>
                                    {p.amountAnnual > 0 && <span className="ml-2 text-brand-600 font-medium">({formatCurrency(p.amountAnnual, p.currency, 'pt-BR')} / yr)</span>}
                                  </p>
                                )) : (
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatCurrency(plan.price, plan.currency, 'pt-BR')}
                                    <span className="text-gray-500 font-normal"> / mo</span>
                                    {plan.priceAnnual > 0 && <span className="ml-2 text-indigo-600">({formatCurrency(plan.priceAnnual, plan.currency, 'pt-BR')} / yr)</span>}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {plan.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {trialDays > 0 && (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                                    {trialDays}d trial
                                  </span>
                                )}
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-100 text-blue-800">
                                  {moduleCount}/{AVAILABLE_MODULES.length} modules
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button onClick={() => handleEdit(plan)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors">
                                <PencilIcon className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDelete(plan.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Módulos resumidos */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {AVAILABLE_MODULES.map(mod => {
                            const enabled = plan?.features?.allowedModules?.[mod.key] !== false;
                            return (
                              <span key={mod.key} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${enabled ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400 line-through'
                                }`}>
                                {mod.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <PlanModal
          show={showModal}
          toggle={() => setShowModal(false)}
          plan={selectedPlan}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
};

export default Plans;
