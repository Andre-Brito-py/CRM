import { twMerge } from 'tailwind-merge';

const Button = ({ children, className, ...rest }) => {
  return (
    <button
      className={twMerge(
        'flex items-center justify-center px-8 py-3 space-x-3 rounded-2xl font-executive font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200/50 dark:border-zinc-700/50 shadow-premium-sm hover:shadow-premium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white hover:border-indigo-500/30 dark:hover:border-indigo-500/30',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;

