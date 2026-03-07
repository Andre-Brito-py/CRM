import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';
import useContacts from '@/hooks/data/useContacts';
import useCompanies from '@/hooks/data/useCompanies';

const AddDealModal = ({ isOpen, toggle, slug, stages }) => {
  const { mutate } = useSWRConfig();
  const { data: contactsData } = useContacts(slug);
  const { data: companiesData } = useCompanies(slug);

  const [isSubmitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [stageId, setStageId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [closeDate, setCloseDate] = useState('');

  // Set default stage
  useEffect(() => {
    if (stages && stages.length > 0 && !stageId) {
      setStageId(stages[0].id);
    }
  }, [stages, stageId]);

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api(`/api/workspace/${slug}/deals`, {
        body: {
          name,
          amount,
          stageId,
          priority,
          contactId: contactId || undefined,
          companyId: companyId || undefined,
          closeDate: closeDate || undefined
        },
        method: 'POST',
      });

      if (response.data) {
        toast.success('Deal created successfully!');
        mutate(`/api/workspace/${slug}/pipelines`);
        setName('');
        setAmount('');
        toggle();
      } else if (response.error) {
        toast.error(response.error.msg);
      } else if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={isOpen} title="Add New Deal" toggle={toggle}>
      <form onSubmit={handleCreateDeal} className="space-y-4 w-96">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Deal Name *
          </label>
          <input
            type="text"
            id="name"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount ($)
          </label>
          <input
            type="number"
            id="amount"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
          />
        </div>

        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
            Stage *
          </label>
          <select
            id="stage"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            required
          >
            {stages?.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label htmlFor="closeDate" className="block text-sm font-medium text-gray-700">
              Close Date
            </label>
            <input
              type="date"
              id="closeDate"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
            Contact
          </label>
          <select
            id="contact"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Select a contact...</option>
            {contactsData?.contacts?.map(contact => (
              <option key={contact.id} value={contact.id}>{contact.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">
            Company
          </label>
          <select
            id="company"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">Select a company...</option>
            {companiesData?.companies?.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="button"
            className="mr-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
            onClick={toggle}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-white bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Deal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddDealModal;
