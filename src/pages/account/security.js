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

const SecuritySettings = () => {
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
            toast.error('Failed to initialize 2FA setup.');
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
                toast.success('Two-Factor Authentication enabled successfully!');
                setIs2FAEnabled(true);
                setShowSetupModal(false);
                setToken2fa('');
                await update(); // Update NextAuth session
            }
        } catch (error) {
            toast.error(error.message || 'Invalid 2FA code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisable2FA = async () => {
        if (confirm('Are you sure you want to disable Two-Factor Authentication?')) {
            try {
                // Here we could ask for password to disable, but for simplicity we rely on an active session
                // However, a complete flow would require verifying a token again to disable
                // Let's assume the user has to enter a token to turn it off
                const token = prompt('Please enter your 6-digit authenticator code to disable 2FA:');

                if (!token) return;

                const response = await api('/api/auth/2fa/verify', {
                    method: 'POST',
                    body: JSON.stringify({ token: token, enable: false }),
                });

                if (response.data.success) {
                    toast.success('Two-Factor Authentication disabled.');
                    setIs2FAEnabled(false);
                    await update();
                }
            } catch (error) {
                toast.error('Failed to disable 2FA. Invalid code.');
            }
        }
    };

    return (
        <AccountLayout>
            <Meta title="Nextacular - Security Settings" />
            <Content.Title title="Security Settings" subtitle="Manage your account security and authentication methods" />
            <Content.Divider />
            <Content.Container>
                <Card>
                    <Card.Body title="Two-Factor Authentication (2FA)">
                        <div className="flex flex-col space-y-4">
                            <p className="text-gray-600">
                                Add an extra layer of security to your account. Once enabled, you'll be required to enter both your password and an authentication code from your mobile device to sign in.
                            </p>

                            <div className="flex items-center space-x-4">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${is2FAEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {is2FAEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>

                            <div className="pt-4 flex">
                                {is2FAEnabled ? (
                                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDisable2FA}>
                                        Disable 2FA
                                    </Button>
                                ) : (
                                    <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSetup2FA}>
                                        Set up 2FA
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Content.Container>

            <Modal show={showSetupModal} toggle={() => setShowSetupModal(false)}>
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Set up Two-Factor Authentication</h3>
                    <p className="text-gray-600 mb-4">
                        Scan the QR code below with your authenticator app (e.g., Google Authenticator, Authy, or 1Password).
                    </p>

                    <div className="flex justify-center mb-6 p-4 bg-white rounded-lg border">
                        {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />}
                    </div>

                    <form onSubmit={handleVerify2FA}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Authenticator Code</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                                placeholder="000000"
                                value={token2fa}
                                onChange={(e) => setToken2fa(e.target.value)}
                                maxLength={6}
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button type="button" className="text-gray-700 bg-gray-100 hover:bg-gray-200" onClick={() => setShowSetupModal(false)}>Cancel</Button>
                            <Button type="submit" className="text-white bg-brand-600 hover:bg-brand-700" disabled={isSubmitting || token2fa.length < 6}>
                                {isSubmitting ? 'Verifying...' : 'Verify & Enable'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </AccountLayout>
    );
};

export default SecuritySettings;
