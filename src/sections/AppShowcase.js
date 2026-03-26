import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  DevicePhoneMobileIcon, 
  BoltIcon, 
  BellAlertIcon, 
  CursorArrowRaysIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import Modal from '@/components/Modal';

const AppShowcase = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const toggleModal = () => setShowModal(!showModal);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const url = `${window.location.origin}/?source=qrcode`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: {
            dark: '#111827', // gray-900
            light: '#ffffff'
          }
        });
        setQrCodeUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    };

    if (showModal && !qrCodeUrl) {
      generateQRCode();
    }
  }, [showModal, qrCodeUrl]);

  const features = [
    {
      title: t('landing.app.feature1.title'),
      desc: t('landing.app.feature1.desc'),
      icon: BoltIcon,
      color: 'bg-blue-500',
    },
    {
      title: t('landing.app.feature2.title'),
      desc: t('landing.app.feature2.desc'),
      icon: BellAlertIcon,
      color: 'bg-amber-500',
    },
    {
      title: t('landing.app.feature3.title'),
      desc: t('landing.app.feature3.desc'),
      icon: CursorArrowRaysIcon,
      color: 'bg-emerald-500',
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-white dark:bg-gray-900">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold mb-6">
              <DevicePhoneMobileIcon className="w-4 h-4" />
              <span>Next-Gen Mobile Experience</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
              {t('landing.app.title')}
            </h2>
            
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-xl">
              {t('landing.app.subtitle')}
            </p>

            <div className="space-y-8">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-4"
                >
                  <div className={`${feature.color} p-2.5 rounded-xl shadow-lg flex-shrink-0 w-12 h-12 flex items-center justify-center`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12">
                <button 
                  onClick={toggleModal}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-black/10 dark:shadow-white/5 active:scale-95"
                >
                    {t('landing.app.cta')}
                </button>
            </div>
          </motion.div>

          {/* Visual Showcase (CSS Mockup) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" }}
            className="flex justify-center lg:justify-end relative"
          >
            {/* Smartphone Frame */}
            <div className="relative w-[320px] h-[640px] bg-zinc-900 rounded-[3rem] p-3 shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_40px_100px_rgba(0,0,0,0.4)] border-4 border-zinc-800">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-20" />
                
                <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 rounded-[2.5rem] overflow-hidden relative">
                    {/* Fake App UI */}
                    <div className="p-6 pt-12 space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full" />
                            <div className="flex gap-2">
                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-md" />
                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-md" />
                            </div>
                        </div>

                        <div className="h-40 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 p-4 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                             <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded-full mb-4" />
                             <div className="flex items-end gap-2 h-20">
                                <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t-lg h-[40%]" />
                                <div className="flex-1 bg-blue-400 dark:bg-blue-600 rounded-t-lg h-[70%]" />
                                <div className="flex-1 bg-blue-600 dark:bg-blue-500 rounded-t-lg h-[100%]" />
                                <div className="flex-1 bg-blue-300 dark:bg-blue-700 rounded-t-lg h-[60%]" />
                             </div>
                        </div>

                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-center bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-sm border border-gray-50 dark:border-zinc-800">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-2/3 h-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
                                        <div className="w-1/3 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Bottom Nav */}
                    <div className="absolute bottom-0 inset-x-0 h-16 border-t border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex justify-around items-center px-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-md" />
                        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-md" />
                        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-md" />
                        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Floating Elements for WOW factor */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 -left-12 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-30"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-lg">
                        <BoltIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Instant Close</p>
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">$12,400.00</p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-32 -right-8 bg-blue-600 p-4 rounded-2xl shadow-2xl z-30 text-white"
            >
                <div className="flex items-center gap-3">
                    <BellAlertIcon className="w-6 h-6" />
                    <div>
                        <p className="text-xs font-bold leading-none">New Lead!</p>
                        <p className="text-[10px] opacity-80 mt-1">Sarah from Enterprise</p>
                    </div>
                </div>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* QR Code Modal for Desktop Verification */}
      <Modal
        show={showModal}
        title={t('landing.app.modal.title')}
        toggle={toggleModal}
      >
        <div className="flex flex-col items-center text-center py-6">
            <div className="w-56 h-56 bg-white dark:bg-white rounded-3xl flex items-center justify-center mb-8 border-2 border-gray-100 dark:border-gray-800 shadow-2xl relative overflow-hidden group p-4">
                {qrCodeUrl ? (
                  <motion.img 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={qrCodeUrl} 
                    alt="Vysify App QR Code" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <QrCodeIcon className="w-16 h-16 text-gray-300 animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Generating...</span>
                  </div>
                )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
                {t('landing.app.modal.desc')}
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-3 text-left">
                <div className="bg-blue-500 p-1.5 rounded-lg text-white mt-0.5">
                    <DevicePhoneMobileIcon className="w-4 h-4" />
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                    {t('landing.app.modal.instruction')}
                </p>
            </div>
            
            <button 
                onClick={toggleModal}
                className="mt-10 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20"
            >
                {t('pwa.prompt.close')}
            </button>
        </div>
      </Modal>
    </section>
  );
};

export default AppShowcase;
