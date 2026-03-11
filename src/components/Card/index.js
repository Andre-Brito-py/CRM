const Card = ({ children, danger }) => {
  return danger ? (
    <div className="flex flex-col justify-between border-2 border-red-500/20 rounded-[32px] bg-white dark:bg-zinc-900/50 shadow-xl shadow-red-500/5 transition-all duration-300">
      {children}
    </div>
  ) : (
    <div className="premium-card">
      {children}
    </div>
  );
};

Card.Body = ({ children, subtitle, title }) => {
  return (
    <div className="flex flex-col p-8 space-y-4">
      {title ? (
        <h2 className="text-2xl font-executive font-bold tracking-tight">{title}</h2>
      ) : (
        <div className="w-1/3 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
      )}
      {subtitle && <h3 className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{subtitle}</h3>}
      <div className="flex flex-col pt-2">{children}</div>
    </div>
  );
};

Card.Empty = ({ children }) => {
  return (
    <div className="p-8">
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] text-zinc-400 dark:text-zinc-500">
        <p className="font-medium">{children}</p>
      </div>
    </div>
  );
};

Card.Footer = ({ children }) => {
  return (
    <div className="flex flex-row items-center justify-between px-8 py-6 space-x-5 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800/50 rounded-b-[32px]">
      {children}
    </div>
  );
};

Card.Body.displayName = 'Body';
Card.Empty.displayName = 'Empty';
Card.Footer.displayName = 'Footer';

export default Card;
