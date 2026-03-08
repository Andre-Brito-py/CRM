import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import Modal from '@/components/Modal/index';
import api from '@/lib/common/api';
import useMembers from '@/hooks/data/useMembers';
import useContacts from '@/hooks/data/useContacts';
import useDeals from '@/hooks/data/useDeals';

const AddTaskModal = ({ isOpen, toggle, slug, initialContactId, initialDealId }) => {
  const { mutate } = useSWRConfig();
  const { data: membersData } = useMembers(slug);
  const { data: contactsData } = useContacts(slug);
  const { data: dealsData } = useDeals(slug);

  const [isSubmitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [contactId, setContactId] = useState(initialContactId || '');
  const [dealId, setDealId] = useState(initialDealId || '');

  useEffect(() => {
    if (isOpen) {
      if (initialContactId) setContactId(initialContactId);
      if (initialDealId) setDealId(initialDealId);
    }
  }, [isOpen, initialContactId, initialDealId]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api(`/api/workspace/${slug}/tasks`, {
        body: {
          title,
          content,
          dueDate,
          priority,
          assigneeId: assigneeId || undefined,
          contactId: contactId || undefined,
          dealId: dealId || undefined
        },
        method: 'POST',
      });

      if (response.data) {
        toast.success('Task created successfully!');
        mutate(`/api/workspace/${slug}/tasks`);
        // If we are in a context where we filter by contact/deal, we might want to mutate that too
        if (contactId) mutate(`/api/workspace/${slug}/tasks?contactId=${contactId}`);
        if (dealId) mutate(`/api/workspace/${slug}/tasks?dealId=${dealId}`);

        setTitle('');
        setContent('');
        setDueDate('');
        setPriority('MEDIUM');
        setAssigneeId('');
        if (!initialContactId) setContactId('');
        if (!initialDealId) setDealId('');
        toggle();
      } else if (response.error) {
        toast.error(response.error.msg);
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
    <Modal show={isOpen} title="Add New Task" toggle={toggle}>
      <form onSubmit={handleCreateTask} className="space-y-4 w-96">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            id="title"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="content"
            rows={3}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700">
            Assignee
          </label>
          <select
            id="assigneeId"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Select Assignee</option>
            {membersData?.members?.map((member) => (
              <option key={member.id} value={member.member.id}>
                {member.member.name || member.member.email}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactId" className="block text-sm font-medium text-gray-700">
              Related Contact
            </label>
            <select
              id="contactId"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              disabled={!!initialContactId}
            >
              <option value="">Select Contact</option>
              {contactsData?.contacts?.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dealId" className="block text-sm font-medium text-gray-700">
              Related Deal
            </label>
            <select
              id="dealId"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              disabled={!!initialDealId}
            >
              <option value="">Select Deal</option>
              {dealsData?.deals?.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
            Due Date
          </label>
          <input
            type="datetime-local"
            id="dueDate"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;
