import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';
import useContacts from '@/hooks/data/useContacts';
import useCompanies from '@/hooks/data/useCompanies';
import useMembers from '@/hooks/data/useMembers';
import useWorkspace from '@/hooks/data/useWorkspace';
import CustomFieldsRenderer from '@/components/CustomFieldsRenderer';

const AddDealModal = ({ isOpen, toggle, slug, stages }) => {
  const { mutate } = useSWRConfig();
  const { data: contactsData } = useContacts(slug);
  const { data: companiesData } = useCompanies(slug);
  const { data: membersData } = useMembers(slug);
  const { data: workspaceData } = useWorkspace(slug);

  const [isSubmitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [stageId, setStageId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [userId, setUserId] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [customFields, setCustomFields] = useState({});

  const handleCustomFieldChange = (key, value) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

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
          userId: userId || undefined,
          closeDate: closeDate || undefined,
          customFields
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
    <Modal show={isOpen} title="ADICIONAR NEGÓCIO" toggle={toggle}>
      <form onSubmit={handleCreateDeal} className="space-y-8 w-full max-w-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Nome do Negócio *
            </label>
            <input
              type="text"
              id="name"
              placeholder="Ex: Consultoria Premium"
              className="form-input-premium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="amount" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Valor Estimado (R$)
            </label>
            <input
              type="number"
              id="amount"
              placeholder="0.00"
              className="form-input-premium"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="stage" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Etapa do Funil *
            </label>
            <select
              id="stage"
              className="form-input-premium appearance-none cursor-pointer"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              required
            >
              {stages?.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Prioridade
            </label>
            <select
              id="priority"
              className="form-input-premium appearance-none cursor-pointer"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">BAIXA</option>
              <option value="MEDIUM">MÉDIA</option>
              <option value="HIGH">ALTA</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label htmlFor="assignee" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Responsável
            </label>
            <select
              id="assignee"
              className="form-input-premium appearance-none cursor-pointer"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">SELECIONAR...</option>
              {membersData?.members?.map(member => (
                <option key={member.member.id} value={member.member.id}>{member.member.name?.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="closeDate" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Previsão de Fechamento
            </label>
            <input
              type="date"
              id="closeDate"
              className="form-input-premium"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label htmlFor="contact" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Contato Principal
            </label>
            <select
              id="contact"
              className="form-input-premium appearance-none cursor-pointer"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">VINCULAR CONTATO...</option>
              {contactsData?.contacts?.map(contact => (
                <option key={contact.id} value={contact.id}>{contact.name?.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="company" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 italic">
              Empresa Relacionada
            </label>
            <select
              id="company"
              className="form-input-premium appearance-none cursor-pointer"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">VINCULAR EMPRESA...</option>
              {companiesData?.companies?.map(company => (
                <option key={company.id} value={company.id}>{company.name?.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800/50">
          <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4 pl-1 italic">Campos Personalizados</h4>
          <CustomFieldsRenderer
            fields={workspaceData?.workspace?.customFieldDefinitions}
            values={customFields}
            onChange={handleCustomFieldChange}
            area="sales"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            className="flex-1 px-8 py-4 text-[11px] font-black text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl transition-all uppercase tracking-widest italic"
            onClick={toggle}
            disabled={isSubmitting}
          >
            Cancelar Emissão
          </button>
          <button
            type="submit"
            className="flex-[2] px-10 py-4 text-[11px] font-black text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/25 active:scale-95 transition-all uppercase tracking-widest italic disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Gerando Negócio...' : 'Confirmar Novo Negócio'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddDealModal;
