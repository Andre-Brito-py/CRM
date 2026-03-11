const Content = ({ children }) => {
  return (
    <div className="flex flex-col flex-1 h-full p-5 space-y-5 overflow-y-auto md:p-10">
      {children}
    </div>
  );
};

Content.Container = ({ children }) => {
  return <div className="flex flex-col pb-10 space-y-5">{children}</div>;
};

Content.Divider = ({ thick }) => {
  return thick ? (
    <hr className="border-2 dark:border-gray-600" />
  ) : (
    <hr className="border dark:border-gray-700" />
  );
};

Content.Empty = ({ children }) => {
  return (
    <div className="p-8">
      <div className="flex items-center justify-center p-5 bg-zinc-100 dark:bg-zinc-800/50 border-4 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{children}</p>
      </div>
    </div>
  );
};

Content.Title = ({ subtitle, title }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold md:text-4xl text-zinc-900 dark:text-white">{title}</h1>
      <h3 className="text-zinc-400 dark:text-zinc-500 font-medium">{subtitle}</h3>
    </div>
  );
};

Content.Container.displayName = 'Container';
Content.Divider.displayName = 'Divider';
Content.Empty.displayName = 'Empty';
Content.Title.displayName = 'Title';

export default Content;
