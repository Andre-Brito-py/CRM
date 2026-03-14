import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import Modal from '@/components/Modal/index';
import api from '@/lib/common/api';
import { useTranslation } from 'react-i18next';

const SecuritySettings = () => {
    const { t } = useTranslation();
    const { data: session, update } = useSession();
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [token2fa, setToken2fa] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setIs2FAEnabled(session.user.twoFactorEnabled);
        }
    }, [session]);

    const handleSetup2FA = async () => {
        try {
            const response = await api('/api/auth/2fa/setup', {
                method: 'POST',
            });

            setQrCodeUrl(response.data.qrCodeUrl);
            setShowSetupModal(true);
        } catch (error) {
            toast.error(t('security.2fa.setupFailed'));
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        if (token2fa.length < 6) return;

        setIsSubmitting(true);
        try {
            const response = await api('/api/auth/2fa/verify', {
                method: 'POST',
                body: JSON.stringify({ token: token2fa, enable: true }),
            });

            if (response.data.success) {
                toast.success(t('security.2fa.enabledSuccess'));
                setIs2FAEnabled(true);
                setShowSetupModal(false);
                setToken2fa('');
                await update(); // Update NextAuth session
            }
        } catch (error) {
            toast.error(error.message || t('security.2fa.invalidCode'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisable2FA = async () => {
        if (confirm(t('security.2fa.disableConfirm'))) {
            try {
                // Here we could ask for password to disable, but for simplicity we rely on an active session
                // However, a complete flow would require verifying a token again to disable
                // Let's assume the user has to enter a token to turn it off
                const token = prompt(t('security.2fa.disablePrompt'));

                if (!token) return;

                const response = await api('/api/auth/2fa/verify', {
                    method: 'POST',
                    body: JSON.stringify({ token: token, enable: false }),
                });

                if (response.data.success) {
                    toast.success(t('security.2fa.disabledSuccess'));
                    setIs2FAEnabled(false);
                    await update();
                }
            } catch (error) {
                toast.error(t('security.2fa.disableFailed'));
            }
        }
    };

    return (
        <AccountLayout>
            <Meta title={`Closify - ${t('security.title')}`} />
            <Content.Title title={t('security.title')} subtitle={t('security.subtitle')} />
            <Content.Divider />
            <Content.Container>
                <Card>
                    <Card.Body title={t('security.2fa.cardTitle')}>
                        <div className="flex flex-col space-y-4">
                            <p className="text-zinc-600 dark:text-zinc-400">
                                {t('security.2fa.description')}
                            </p>

                            <div className="flex items-center space-x-4">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${is2FAEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}`}>
                                    {is2FAEnabled ? t('security.2fa.status.enabled') : t('security.2fa.status.disabled')}
                                </span>
                            </div>

                            <div className="pt-4 flex">
                                {is2FAEnabled ? (
                                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDisable2FA}>
                                        {t('security.2fa.disable')}
                                    </Button>
                                ) : (
                                    <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSetup2FA}>
                                        {t('security.2fa.setup')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Content.Container>

            <Modal show={showSetupModal} toggle={() => setShowSetupModal(false)}>
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">{t('security.2fa.modal.title')}</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        {t('security.2fa.modal.subtitle')}
                    </p>

                    <div className="flex justify-center mb-6 p-4 bg-white dark:bg-zinc-800 rounded-lg border dark:border-zinc-700">
                        {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />}
                    </div>

                    <form onSubmit={handleVerify2FA}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('security.2fa.modal.codeLabel')}</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all"
                                placeholder="000000"
                                value={token2fa}
                                onChange={(e) => setToken2fa(e.target.value)}
                                maxLength={6}
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button type="button" className="text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold" onClick={() => setShowSetupModal(false)}>{t('common.action.cancel')}</Button>
                            <Button type="submit" className="text-white bg-brand-600 hover:bg-brand-700" disabled={isSubmitting || token2fa.length < 6}>
                                {isSubmitting ? t('security.2fa.verifying') : t('security.2fa.verifyEnable')}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </AccountLayout>
    );
};

export default SecuritySettings;
