import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';

const AddCompanyModal = ({ isOpen, toggle, slug }) => {
  const { mutate } = useSWRConfig();
  const [isSubmitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api(`/api/workspace/${slug}/companies`, {
        body: { name, website, industry },
        method: 'POST',
      });

      if (response.data) {
        toast.success('Company created successfully!');
        mutate(`/api/workspace/${slug}/companies`);
        setName('');
        setWebsite('');
        setIndustry('');
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
    <Modal show={isOpen} title="Add New Company" toggle={toggle}>
      <form onSubmit={handleCreateCompany} className="space-y-4 w-96">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Company Name *
          </label>
          <input
            type="text"
            id="name"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            type="text"
            id="website"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="example.com"
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <input
            type="text"
            id="industry"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Technology, Retail, etc."
          />
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
            className="text-white bg-brand-600 hover:bg-brand-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddCompanyModal;
