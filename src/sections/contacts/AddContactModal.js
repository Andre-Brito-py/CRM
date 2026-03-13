import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';
import useWorkspace from '@/hooks/data/useWorkspace';
import CustomFieldsRenderer from '@/components/CustomFieldsRenderer';

const AddContactModal = ({ isOpen, toggle, slug }) => {
  const { mutate } = useSWRConfig();
  const { data: workspaceData } = useWorkspace(slug);
  const [isSubmitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [customFields, setCustomFields] = useState({});

  const handleCustomFieldChange = (key, value) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api(`/api/workspace/${slug}/contacts`, {
        body: { name, email, phone, jobTitle, customFields },
        method: 'POST',
      });

      if (response.data) {
        toast.success('Contact created successfully!');
        mutate((key) => typeof key === 'string' && key.startsWith(`/api/workspace/${slug}/contacts`));
        setName('');
        setEmail('');
        setPhone('');
        setJobTitle('');
        setCustomFields({});
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
    <Modal show={isOpen} title="Add New Contact" toggle={toggle}>
      <form onSubmit={handleCreateContact} className="space-y-4 w-96">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name *
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
            Job Title
          </label>
          <input
            type="text"
            id="jobTitle"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>

        <CustomFieldsRenderer
          fields={workspaceData?.workspace?.customFieldDefinitions}
          values={customFields}
          onChange={handleCustomFieldChange}
          area="support"
        />

        <div className="flex justify-end pt-4 border-t border-gray-100">
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
            {isSubmitting ? 'Creating...' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddContactModal;
