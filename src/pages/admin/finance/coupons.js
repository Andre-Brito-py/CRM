import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PlusIcon, TicketIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import AdminLayout from '@/layouts/AdminLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import Modal from '@/components/Modal/index';
import Content from '@/components/Content/index';

const CouponsAdmin = () => {
  const { data: session } = useSession();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCodes, setPromoCodes] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage', // percentage or fixed
    value: '',
    duration: 'once',
    durationInMonths: '',
    currency: 'USD',
    maxRedemptions: '',
  });

  const [promoData, setPromoData] = useState({
    code: '',
    maxRedemptions: '',
    expiresAt: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await api('/api/admin/finance/coupons');
      setCoupons(res.data?.coupons || []);
    } catch (error) {
      toast.error('Erro ao buscar cupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchPromoCodes = async (couponId) => {
    try {
      const res = await api(`/api/admin/finance/promotion-codes?couponId=${couponId}`);
      setPromoCodes(res.data?.codes || []);
    } catch (error) {
      toast.error('Erro ao buscar códigos');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        duration: formData.duration,
        durationInMonths: formData.durationInMonths,
        currency: formData.currency,
        maxRedemptions: formData.maxRedemptions,
      };
      if (formData.type === 'percentage') {
        payload.percentOff = formData.value;
      } else {
        payload.amountOff = formData.value;
      }

      await api('/api/admin/finance/coupons', {
        method: 'POST',
        body: payload,
      });
      toast.success('Cupom criado com sucesso');
      setShowModal(false);
      setFormData({ name: '', type: 'percentage', value: '', duration: 'once', durationInMonths: '', currency: 'USD', maxRedemptions: '' });
      fetchCoupons();
    } catch (error) {
      toast.error(error.message || 'Erro ao criar cupom');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm('Deseja realmente excluir este cupom? (Isso o desativará no Stripe também)')) return;
    try {
      await api('/api/admin/finance/coupons', {
        method: 'DELETE',
        body: { id },
      });
      toast.success('Cupom excluído');
      fetchCoupons();
    } catch (error) {
      toast.error('Erro ao excluir cupom');
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api('/api/admin/finance/promotion-codes', {
        method: 'POST',
        body: {
          couponId: selectedCoupon.id,
          ...promoData,
        },
      });
      toast.success('Código promocional gerado');
      setShowPromoModal(false);
      setPromoData({ code: '', maxRedemptions: '', expiresAt: '' });
      fetchPromoCodes(selectedCoupon.id);
    } catch (error) {
      toast.error(error.message || 'Erro ao criar código');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePromoStatus = async (promoId, currentStatus) => {
    try {
      await api('/api/admin/finance/promotion-codes', {
        method: 'PATCH',
        body: { id: promoId, isActive: !currentStatus },
      });
      fetchPromoCodes(selectedCoupon.id);
      toast.success('Status atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const openPromoList = (coupon) => {
    setSelectedCoupon(coupon);
    fetchPromoCodes(coupon.id);
    setShowPromoModal(true);
  };

  if (loading) return null;

  return (
    <AdminLayout>
      <Meta title="Admin - Cupons & Promoções" />
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <Content.Title
            title="Cupons & Promoções"
            subtitle="Gerencie ofertas e códigos de desconto para seus clientes"
            className="font-executive"
          />
          <Button
            onClick={() => setShowModal(true)}
            className="bg-zinc-900 text-white hover:bg-zinc-800 transition-all rounded-xl px-6 py-2.5 font-bold flex items-center gap-2 shadow-lg shadow-zinc-200/50 dark:shadow-none"
          >
            <PlusIcon className="w-5 h-5" />
            Novo Cupom
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="group hover:scale-[1.02] transition-all duration-300 border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => handleDeleteCoupon(coupon.id)}
                  className="text-zinc-300 hover:text-red-500 transition-colors p-2"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <Card.Body 
                title={coupon.name} 
                subtitle={`Duração: ${coupon.duration === 'once' ? 'Uma vez' : coupon.duration === 'forever' ? 'Para sempre' : 'Repetido'}`}
              >
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {coupon.percentOff ? `${coupon.percentOff}%` : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: coupon.currency }).format(coupon.amountOff)}`}
                  </span>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">OFF</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-xs font-bold text-zinc-500 border border-zinc-100 dark:border-zinc-800">
                    {coupon._count.promotionCodes} Códigos
                  </span>
                </div>
              </Card.Body>
              <Card.Footer className="bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => openPromoList(coupon)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  <TicketIcon className="w-4 h-4" />
                  Gerenciar Códigos
                </button>
              </Card.Footer>
            </Card>
          ))}
        </div>

        {/* Modal Novo Cupom */}
        <Modal show={showModal} title="Criar Novo Cupom" toggle={() => setShowModal(false)}>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nome da Promoção</label>
              <input
                type="text"
                required
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                placeholder="Ex: Black Friday 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Tipo</label>
                <select
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="percentage">Porcentagem</option>
                  <option value="fixed">Valor Fixo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Valor</label>
                <input
                  type="number"
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                  placeholder="Ex: 20"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Duração do Desconto</label>
              <select
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              >
                <option value="once">Apenas na primeira fatura</option>
                <option value="forever">Em todas as faturas (Vitalício)</option>
                <option value="repeating">Por alguns meses</option>
              </select>
            </div>
            {formData.duration === 'repeating' && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Número de Meses</label>
                <input
                  type="number"
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                  value={formData.durationInMonths}
                  onChange={(e) => setFormData({ ...formData, durationInMonths: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Limite de Usos (Opcional)</label>
              <input
                type="number"
                min="1"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                placeholder="Ex: 50"
                value={formData.maxRedemptions}
                onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
              />
            </div>
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-zinc-900 text-white rounded-xl py-4 font-bold hover:bg-zinc-800 transition-all shadow-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processando...' : 'Criar Cupom no Stripe'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Códigos Promocionais */}
        <Modal show={showPromoModal} title={`Códigos para: ${selectedCoupon?.name}`} toggle={() => setShowPromoModal(false)}>
          <div className="space-y-6">
            <form onSubmit={handleCreatePromo} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none"
                  placeholder="Código (Ex: VERAO20)"
                  value={promoData.code}
                  onChange={(e) => setPromoData({ ...promoData, code: e.target.value.toUpperCase() })}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-zinc-900 text-white px-4 rounded-xl text-xs font-bold"
                >
                  Gerar
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Limite de Usos (Opcional)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none"
                    placeholder="Ex: 100"
                    value={promoData.maxRedemptions}
                    onChange={(e) => setPromoData({ ...promoData, maxRedemptions: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Validade (Opcional)</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none"
                    value={promoData.expiresAt}
                    onChange={(e) => setPromoData({ ...promoData, expiresAt: e.target.value })}
                  />
                </div>
              </div>
            </form>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {promoCodes.map((promo) => (
                <div key={promo.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                  <div>
                    <p className="text-sm font-black text-zinc-900 dark:text-white tracking-widest">{promo.code}</p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-tight">Usado {promo.timesRedeemed} vezes</p>
                  </div>
                  <button
                    onClick={() => togglePromoStatus(promo.id, promo.isActive)}
                    className={`p-2 rounded-xl transition-all ${promo.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-300 hover:bg-zinc-50'}`}
                  >
                    {promo.isActive ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                  </button>
                </div>
              ))}
              {promoCodes.length === 0 && (
                <p className="text-center py-8 text-sm text-zinc-400">Nenhum código gerado para este cupom.</p>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default CouponsAdmin;
