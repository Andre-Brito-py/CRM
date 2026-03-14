import Logo from '@/components/Logo';
import Link from 'next/link';

const Footer = () => {
  return (
    <div className="w-full">
      <div className="relative flex flex-col md:mx-auto md:w-3/4">
        <footer className="flex flex-col items-center justify-between py-10 border-t border-gray-100 md:flex-row space-y-5 md:space-y-0 text-gray-500">
          <Logo variant="full" className="opacity-80 hover:opacity-100 transition-opacity" />
          <nav className="flex flex-wrap justify-center gap-6">
            <a className="hover:text-blue-600 transition-colors">About</a>
            <a className="hover:text-blue-600 transition-colors">Showcase</a>
            <a className="hover:text-blue-600 transition-colors">Community</a>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </nav>
        </footer>
        <p className="py-5 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} Closify CRM. Elevating your business.
        </p>
      </div>
    </div>
  );
};

export default Footer;
