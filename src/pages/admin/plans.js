import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';

const PlanModal = ({ show, toggle, plan, onSave }) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'USD',
    interval: plan?.interval || 'month',
    stripePriceId: plan?.stripePriceId || '',
    features: plan?.features ? JSON.stringify(plan.features, null, 2) : '{\n  "maxUsers": 5,\n  "maxContacts": 1000\n}',
    isActive: plan ? plan.isActive : true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let featuresParsed = null;
      try {
        featuresParsed = JSON.parse(formData.features);
      } catch (err) {
        toast.error('Invalid JSON in features');
        setIsSubmitting(false);
        return;
      }

      await onSave({
        ...formData,
        features: featuresParsed,
        price: parseFloat(formData.price),
      });
      toggle();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} toggle={toggle} title={plan ? 'Edit Plan' : 'Create Plan'}>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Slug</label>
          <input
            type="text"
            name="slug"
            required
            value={formData.slug}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Price</label>
            <input
              type="number"
              name="price"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <input
              type="text"
              name="currency"
              required
              value={formData.currency}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Interval</label>
          <select
            name="interval"
            value={formData.interval}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stripe Price ID (Optional)</label>
          <input
            type="text"
            name="stripePriceId"
            value={formData.stripePriceId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Features (JSON)</label>
          <textarea
            name="features"
            rows={5}
            value={formData.features}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 font-mono text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">Enter valid JSON object.</p>
        </div>
        <div className="flex items-center">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>
        <div className="flex justify-end space-x-3 mt-5">
          <Button
            type="button"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={toggle}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-white bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const Plans = () => {
  const { data: session } = useSession();
  const { data, mutate } = useSWR(session ? '/api/admin/plans' : null, fetcher);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const plans = data?.data?.plans || [];
  const isLoading = !data;

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
    try {
      if (selectedPlan) {
        await api(`/api/admin/plans/${selectedPlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData),
        });
        toast.success('Plan updated successfully');
      } else {
        await api('/api/admin/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData),
        });
        toast.success('Plan created successfully');
      }
      mutate();
    } catch (error) {
      throw error;
    }
  };

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Subscription Plans</h1>
          <Button
            onClick={handleCreate}
            className="text-white bg-blue-600 hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Plan
          </Button>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No plans found. Create one to get started.</div>
            ) : (
              <ul role="list" className="divide-y divide-gray-200">
                {plans.map((plan) => (
                  <li key={plan.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-0">
                            <p className="text-sm font-medium text-blue-600 truncate">{plan.name}</p>
                            <p className="text-sm text-gray-500">{plan.description || 'No description'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency }).format(plan.price)}
                              <span className="text-gray-500 font-normal"> / {plan.interval}</span>
                            </p>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {plan.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(plan)}
                              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                        Features: {JSON.stringify(plan.features)}
                      </div>
                    </div>
                  </li>
                ))}
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
