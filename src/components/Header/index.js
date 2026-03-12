import { useSession } from 'next-auth/react';

/**
 * Header – slim page-title strip shown below the Topbar.
 * User menu and notifications have been moved to <Topbar>.
 */
const Header = () => {
  const { data } = useSession();

  return (
    <div className="flex items-center px-8 py-4 mb-6">
      <h5 className="font-executive font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
        {data?.user?.name || data?.user?.email}
      </h5>
    </div>
  );
};

export default Header;
