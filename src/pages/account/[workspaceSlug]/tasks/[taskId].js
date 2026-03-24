import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import useTask from '@/hooks/data/useTask';
import { useWorkspace } from '@/providers/workspace';
import api from '@/lib/common/api';
import useMembers from '@/hooks/data/useMembers';
import useContacts from '@/hooks/data/useContacts';
import useDeals from '@/hooks/data/useDeals';

const TaskDetail = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { taskId } = router.query;
  const { task, isLoading } = useTask(workspace?.slug, taskId);
  const { mutate } = useSWRConfig();
  const { data: membersData } = useMembers(workspace?.slug);
  const { data: contactsData } = useContacts(workspace?.slug, { page: 1, pageSize: 500 });
  const { deals } = useDeals(workspace?.slug, { page: 1, pageSize: 500, compact: true });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setContent(task.content || '');
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
      setPriority(task.priority);
      setIsCompleted(task.isCompleted);
      setAssigneeId(task.assigneeId || '');
      setContactId(task.contactId || '');
      setDealId(task.dealId || '');
    }
  }, [task]);

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api(`/api/workspace/${workspace.slug}/tasks/${taskId}`, {
        body: {
          title,
          content,
          dueDate,
          priority,
          isCompleted,
          assigneeId: assigneeId || undefined,
          contactId: contactId || undefined,
          dealId: dealId || undefined
        },
        method: 'PUT',
      });

      if (response.data) {
        toast.success('Task updated successfully!');
        mutate(`/api/workspace/${workspace.slug}/tasks/${taskId}`);
        mutate(`/api/workspace/${workspace.slug}/tasks`);
      } else {
        toast.error(response.error.msg);
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const response = await api(`/api/workspace/${workspace.slug}/tasks/${taskId}`, {
          method: 'DELETE',
        });

        if (response.data) {
          toast.success('Task deleted successfully!');
          mutate(`/api/workspace/${workspace.slug}/tasks`);
          router.push(`/account/${workspace.slug}/tasks`);
        } else {
          toast.error(response.error.msg);
        }
      } catch (error) {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <Content.Container>
          <p>Loading task...</p>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (!data?.task) {
    return (
      <AccountLayout>
        <Content.Container>
          <p>Task not found</p>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspace?.name} | ${data.task.title}`} />
      <Content.Title
        title="Task Details"
        subtitle="View and update task information"
      />
      <Content.Divider />
      <Content.Container>
        <div className="max-w-2xl">
          <form onSubmit={handleUpdateTask} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
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
                rows={5}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700">
                  Assignee
                </label>
                <select
                  id="assigneeId"
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
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

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="contactId" className="block text-sm font-medium text-gray-700">
                  Related Contact
                </label>
                <select
                  id="contactId"
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
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
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                >
                  <option value="">Select Deal</option>
                  {deals?.map((deal) => (
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
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center">
                <input
                  id="isCompleted"
                  type="checkbox"
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                />
                <label htmlFor="isCompleted" className="ml-2 block text-sm text-gray-900">
                  Mark as completed
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-500"
                onClick={handleDeleteTask}
              >
                Delete Task
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-brand-600 rounded hover:bg-brand-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export default TaskDetail;
