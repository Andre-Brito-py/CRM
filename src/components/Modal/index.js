import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ children, show, title, toggle }) => {
  return (
    <Transition appear as={Fragment} show={show}>
      <Dialog
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={toggle}
      >
        <div className="flex items-center justify-center min-h-screen p-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[6px]" />
          </Transition.Child>

          <span aria-hidden="true" className="inline-block h-screen align-middle">
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <div className="relative inline-block w-full max-w-2xl p-10 overflow-hidden text-left align-middle transition-all transform vysify-glass rounded-[2.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.5)]">
              {title && (
                <Dialog.Title as="h2" className="text-3xl font-black leading-tight text-zinc-900 dark:text-white mb-6 tracking-tight">
                  {title}
                </Dialog.Title>
              )}
              
              <div className="relative z-10 text-zinc-600 dark:text-zinc-300">
                {children}
              </div>

              <button
                className="absolute top-8 right-8 p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-full transition-all duration-300"
                onClick={toggle}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              {/* Decorative accent */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
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
