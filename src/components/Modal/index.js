import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ children, show, title, toggle }) => {
  return (
    <Transition appear as={Fragment} show={show}>
      <Dialog
        className="fixed inset-0 z-50 overflow-y-auto text-gray-800"
        onClose={toggle}
      >
        <div className="flex items-center justify-center h-screen p-5">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <span aria-hidden="true" className="inline-block align-middle">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative inline-block w-full max-w-2xl px-8 py-10 my-10 space-y-5 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800">
              {title && (
                <Dialog.Title as="h2" className="text-2xl font-bold leading-7 text-zinc-900 dark:text-white">
                  {title}
                </Dialog.Title>
              )}
              {children}
              <button
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                onClick={toggle}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

Modal.defaultProps = {
  show: false,
  subtitle: '',
  title: '',
  toggle: null,
};

export default Modal;
