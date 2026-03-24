import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const CookieConsent = ({ onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [prefs, setPrefs] = useState({
    essential: true,
    analytics: true,
    marketing: true,
  });

  useEffect(() => {
    const consent = localStorage.getItem('vysify_cookie_prefs_v2');
    if (!consent) {
      setIsVisible(true);
    } else {
      try {
        setPrefs(JSON.parse(consent));
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const savePreferences = (newPrefs) => {
    localStorage.setItem('vysify_cookie_prefs_v2', JSON.stringify(newPrefs));
    if (newPrefs.analytics && onAccept) {
      onAccept();
    }
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const allIn = { essential: true, analytics: true, marketing: true };
    setPrefs(allIn);
    savePreferences(allIn);
  };

  const handleRejectNonEssential = () => {
    const min = { essential: true, analytics: false, marketing: false };
    setPrefs(min);
    savePreferences(min);
  };

  const handleSaveConfig = () => {
    savePreferences(prefs);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 md:p-8 pointer-events-none">
      <div className="max-w-5xl mx-auto glass-dark border border-white/10 rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.8)] p-6 md:p-8 pointer-events-auto relative overflow-hidden group">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 blur-[100px] rounded-full" />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-sm md:text-base text-zinc-300 leading-relaxed max-w-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                <span className="font-executive font-black text-white text-[10px] uppercase tracking-[0.2em]">Sua Privacidade, Suas Regras</span>
              </div>
              <p className="font-executive">
                O Vysify utiliza cookies para otimizar sua experiência. Você pode aceitar todos os cookies, recusar os não essenciais ou configurar suas preferências agora. 
                Saiba mais em nossa{' '}
                <Link href="/privacy" className="text-brand-400 font-bold hover:text-brand-300 underline underline-offset-4 decoration-brand-500/30">
                  Política de Privacidade
                </Link>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="w-full sm:w-auto px-6 py-3.5 bg-white/5 border border-white/10 text-white font-executive font-bold rounded-2xl hover:bg-white/10 transition-all text-[11px] uppercase tracking-wider"
              >
                Configurar
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="w-full sm:w-auto px-6 py-3.5 bg-white/5 border border-white/10 text-white font-executive font-bold rounded-2xl hover:bg-white/10 transition-all text-[11px] uppercase tracking-wider"
              >
                Recusar
              </button>
              <button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-10 py-4 bg-white text-zinc-900 font-executive font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:scale-[1.02] transition-all text-xs uppercase tracking-widest"
              >
                Aceitar Todos
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-white/5 pt-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CookieType
                    title="Essenciais"
                    desc="Necessários para o site funcionar."
                    checked={true}
                    disabled={true}
                  />
                  <CookieType
                    title="Analytics"
                    desc="Para entendermos como você usa o site."
                    checked={prefs.analytics}
                    onChange={(val) => setPrefs({ ...prefs, analytics: val })}
                  />
                  <CookieType
                    title="Marketing"
                    desc="Para ofertas personalizadas."
                    checked={prefs.marketing}
                    onChange={(val) => setPrefs({ ...prefs, marketing: val })}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    className="px-8 py-3 bg-brand-600 text-white font-executive font-black rounded-xl hover:bg-brand-500 transition-colors text-[10px] uppercase tracking-widest"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const CookieType = ({ title, desc, checked, onChange, disabled = false }) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-start justify-between gap-4">
    <div className="flex-1">
      <div className="text-xs font-black text-white mb-1 uppercase tracking-wider font-executive">{title}</div>
      <div className="text-[10px] text-zinc-500 leading-tight font-executive">{desc}</div>
    </div>
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${checked ? 'bg-brand-500' : 'bg-zinc-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);

export default CookieConsent;
