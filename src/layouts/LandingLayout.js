import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const LandingLayout = ({ children }) => {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  return (
    <main className="relative flex flex-col bg-white text-zinc-900 overflow-x-hidden pt-16">
      {children}
    </main>
  );
};

export default LandingLayout;
