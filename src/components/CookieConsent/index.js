import { useState, useEffect } from 'react';
import Link from 'next/link';

const CookieConsent = ({ onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run on client
    const consent = localStorage.getItem('closify_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('closify_cookie_consent', 'true');
    setIsVisible(false);
    if (onAccept) onAccept();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 md:p-8 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl p-5 md:p-6 border border-gray-700/50 flex flex-col sm:flex-row items-center justify-between gap-6 pointer-events-auto backdrop-blur-xl bg-opacity-95">
        <div className="flex-1 text-sm text-gray-300 leading-relaxed">
          <p>
            Utilizamos cookies essenciais para o funcionamento da plataforma e para melhorar a sua experiência, além de acompanhar métricas de acesso.
            Ao navegar neste site e dentro da plataforma, você concorda firmemente com a nossa{' '}
            <Link href="/privacy" className="text-emerald-400 font-medium hover:text-emerald-300 underline underline-offset-2 transition-colors">
              Política de Privacidade e Cookies
            </Link>.
          </p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Aceitar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
