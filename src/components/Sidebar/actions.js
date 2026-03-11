import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
  CheckIcon,
  ChevronUpDownIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Modal from '@/components/Modal/index';
import { useWorkspaces } from '@/hooks/data/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";

const Actions = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useWorkspaces();
  const { workspace, setWorkspace } = useWorkspace();
  const router = useRouter();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState('');
  const [showModal, setModalState] = useState(false);
  const validName = name.length > 0 && name.length <= 16;

  const createWorkspace = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api('/api/workspace', {
      body: { name },
      method: 'POST',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toggleModal();
        setName('');
        toast.success(t('workspace.created.success'));
      }
    });
  };

  const handleNameChange = (event) => setName(event.target.value);

  const handleWorkspaceChange = (workspace) => {
    setWorkspace(workspace);
    router.replace(`/account/${workspace?.slug}`);
  };

  const toggleModal = () => setModalState(!showModal);

  return (
    <div className="flex flex-col items-stretch justify-center px-5 space-y-3">
      <Button
        id="create-workspace-btn"
        className="w-full justify-start gap-3 py-3 px-4 text-white premium-gradient rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all border border-indigo-400/20"
        onClick={toggleModal}
      >
        <PlusIcon className="w-5 h-5 text-white" aria-hidden="true" />
        <span className="font-semibold">{t('workspace.action.button.label')}</span>
      </Button>
      <Modal show={showModal} title={t('workspace.action.create.title')} toggle={toggleModal}>
        <div className="space-y-6">
          <div className="space-y-2 text-zinc-500">
            <p className="text-sm leading-relaxed">
              {t("workspace.action.create.description.lineOne")}
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-zinc-900 font-display">{t("workspace.action.name.label")}</h3>
            <input
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              disabled={isSubmitting}
              placeholder={t("workspace.suggesion.label")}
              onChange={handleNameChange}
              type="text"
              value={name}
            />
          </div>
          <div className="pt-2">
            <Button
              className="w-full py-4 text-white premium-gradient rounded-xl shadow-xl shadow-indigo-500/25 disabled:opacity-50"
              disabled={!validName || isSubmitting}
              onClick={createWorkspace}
            >
              <span className="font-bold">{t('workspace.action.button.label')}</span>
            </Button>
          </div>
        </div>
      </Modal>
      <Listbox value={workspace} onChange={handleWorkspaceChange}>
        <div className="relative mt-2">
          <Listbox.Button className="relative w-full py-3.5 pl-4 pr-10 text-left bg-white/5 border border-white/10 rounded-xl cursor-default hover:bg-white/10 transition-all focus:outline-none focus:ring-1 focus:ring-white/20 group">
            <span className="block text-zinc-300 truncate font-medium group-hover:text-white transition-colors">
              {isLoading
                ? t('workspace.fetching')
                : data?.workspaces.length === 0
                  ? t("workspace.message.notfound")
                  : workspace === null
                    ? t("workspace.action.label.select")
                    : workspace.name}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
              <ChevronUpDownIcon
                className="w-5 h-5"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          {data?.workspaces.length > 0 && (
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-[60] w-full py-2 mt-2 overflow-hidden text-base glass-dark rounded-2xl shadow-2xl max-h-60 border border-white/10">
                {data?.workspaces.map((workspace, index) => (
                  <Listbox.Option
                    key={index}
                    className={({ active }) =>
                      `${active ? 'text-white bg-white/10' : 'text-zinc-400'}
                          cursor-pointer select-none relative py-3 pl-11 pr-4 transition-colors`
                    }
                    value={workspace}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`${selected ? 'text-white font-semibold' : 'font-normal'
                            } block truncate`}
                        >
                          {workspace.name}
                        </span>
                        {selected ? (
                          <span
                            className="absolute inset-y-0 left-0 flex items-center pl-4 text-indigo-400"
                          >
                            <CheckIcon className="w-5 h-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          )}
        </div>
      </Listbox>
    </div>
  );
};

export default Actions;
