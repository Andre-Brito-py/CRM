import { useState } from 'react';
import { DocumentDuplicateIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import isEmail from 'validator/lib/isEmail';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta';
import Modal from '@/components/Modal/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { getUser } from '@/prisma/services/user';
import { useTranslation } from "react-i18next";
import { authOptions, getAuthOptions } from '@/lib/server/auth';

const Settings = ({ user }) => {
  const [email, setEmail] = useState(user.email || '');
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [showModal, setModalState] = useState(false);
  const [userCode] = useState(user.userCode);
  const [verifyEmail, setVerifyEmail] = useState('');
  const fiscalProfile = user.fiscalProfile || null;
  const [fiscalDocumentType, setFiscalDocumentType] = useState(fiscalProfile?.documentType || 'CPF');
  const [fiscalDocument, setFiscalDocument] = useState(fiscalProfile?.document || '');
  const [fiscalName, setFiscalName] = useState(fiscalProfile?.name || user.name || '');
  const [fiscalEmail, setFiscalEmail] = useState(fiscalProfile?.email || user.email || '');
  const [fiscalPhone, setFiscalPhone] = useState(fiscalProfile?.phone || '');
  const [fiscalCep, setFiscalCep] = useState(fiscalProfile?.cep || '');
  const [fiscalUf, setFiscalUf] = useState(fiscalProfile?.uf || '');
  const [fiscalCodigoMunicipio, setFiscalCodigoMunicipio] = useState(
    fiscalProfile?.codigoMunicipio ? String(fiscalProfile.codigoMunicipio) : ''
  );
  const [fiscalLogradouro, setFiscalLogradouro] = useState(fiscalProfile?.logradouro || '');
  const [fiscalNumero, setFiscalNumero] = useState(fiscalProfile?.numero || '');
  const [fiscalComplemento, setFiscalComplemento] = useState(fiscalProfile?.complemento || '');
  const [fiscalBairro, setFiscalBairro] = useState(fiscalProfile?.bairro || '');
  const validName = name.length > 0 && name.length <= 32;
  const validEmail = isEmail(email);
  const { t, i18n } = useTranslation();
  const verifiedEmail = verifyEmail === email;
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  const copyToClipboard = () => toast.success('Copied to clipboard!');

  const changeName = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api('/api/user/name', {
      body: { name },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Name successfully updated!');
      }
    });
  };

  const changeEmail = (event) => {
    event.preventDefault();
    const result = confirm(
      'Are you sure you want to update your email address?'
    );

    if (result) {
      setSubmittingState(true);
      api('/api/user/email', {
        body: { email },
        method: 'PUT',
      }).then((response) => {
        setSubmittingState(false);

        if (response.errors) {
          Object.keys(response.errors).forEach((error) =>
            toast.error(response.errors[error].msg)
          );
        } else {
          toast.success('Email successfully updated and signing you out!');
          setTimeout(() => signOut({ callbackUrl: '/auth/login' }), 2000);
        }
      });
    }
  };

  const saveFiscalProfile = async (event) => {
    event.preventDefault();
    setSubmittingState(true);
    try {
      const response = await api('/api/user/fiscal-profile', {
        method: 'PUT',
        body: {
          documentType: fiscalDocumentType,
          document: fiscalDocument,
          name: fiscalName,
          email: fiscalEmail,
          phone: fiscalPhone,
          cep: fiscalCep,
          uf: fiscalUf,
          codigoMunicipio: fiscalCodigoMunicipio,
          logradouro: fiscalLogradouro,
          numero: fiscalNumero,
          complemento: fiscalComplemento,
          bairro: fiscalBairro,
        },
      });

      if (response?.errors) {
        Object.keys(response.errors).forEach((error) => toast.error(response.errors[error].msg));
        return;
      }

      toast.success('Dados fiscais salvos.');
    } catch (error) {
      console.error(error);
      toast.error('Falha ao salvar dados fiscais.');
    } finally {
      setSubmittingState(false);
    }
  };

  const deactivateAccount = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api('/api/user', {
      method: 'DELETE',
    }).then((response) => {
      setSubmittingState(false);
      toggleModal();

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Account has been deactivated!');
      }
    });
  };

  const handleEmailChange = (event) => setEmail(event.target.value);

  const handleNameChange = (event) => setName(event.target.value);

  const handleVerifyEmailChange = (event) => setVerifyEmail(event.target.value);

  const toggleModal = () => {
    setVerifyEmail('');
    setModalState(!showModal);
  };

  return (
    <AccountLayout>
      <Meta title="Vysify - Account Settings" />
      <Content.Title
        title={t("settings.header.title")}
        subtitle={t("settings.header.description")}
        className="font-executive"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <form>
            <Card.Body
              title={t("settings.profile.name")}
              subtitle="Please enter your full name, or a display name you are comfortable with"
            >
              <input
                className="w-full md:w-2/3 px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                disabled={isSubmitting}
                onChange={handleNameChange}
                type="text"
                value={name}
              />
            </Card.Body>
            <Card.Footer>
              <small className="font-medium text-zinc-400">{t("settings.profile.name.validation.message")}</small>
              <Button
                className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200"
                disabled={!validName || isSubmitting}
                onClick={changeName}
              >
                {t("common.label.save")}
              </Button>
            </Card.Footer>
          </form>
        </Card>

        <Card>
          <form>
            <Card.Body
              title={t("settings.profile.email.label")}
              subtitle={t("settings.profile.email.description")}
            >
              <input
                className="w-full md:w-2/3 px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                disabled={isSubmitting}
                onChange={handleEmailChange}
                type="email"
                value={email}
              />
            </Card.Body>
            <Card.Footer>
              <small className="font-medium text-zinc-400">{t("settings.profile.email.message")}</small>
              <Button
                className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200"
                disabled={!validEmail || isSubmitting}
                onClick={changeEmail}
              >
                {t("common.label.save")}
              </Button>
            </Card.Footer>
          </form>
        </Card>

        <Card>
          <form>
            <Card.Body
              title="Dados fiscais (para Nota Fiscal)"
              subtitle="Usado para emissão de NFS-e quando aplicável"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:w-2/3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Tipo de documento
                  </label>
                  <select
                    className="appearance-none w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all cursor-pointer"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalDocumentType(e.target.value)}
                    value={fiscalDocumentType}
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    CPF/CNPJ
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalDocument(e.target.value)}
                    type="text"
                    value={fiscalDocument}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Nome/Razão Social
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalName(e.target.value)}
                    type="text"
                    value={fiscalName}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    E-mail
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalEmail(e.target.value)}
                    type="email"
                    value={fiscalEmail}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Telefone
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalPhone(e.target.value)}
                    type="text"
                    value={fiscalPhone}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    UF
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalUf(e.target.value)}
                    type="text"
                    value={fiscalUf}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Código do Município (IBGE)
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalCodigoMunicipio(e.target.value)}
                    type="text"
                    value={fiscalCodigoMunicipio}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    CEP
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalCep(e.target.value)}
                    type="text"
                    value={fiscalCep}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Logradouro
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalLogradouro(e.target.value)}
                    type="text"
                    value={fiscalLogradouro}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Número
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalNumero(e.target.value)}
                    type="text"
                    value={fiscalNumero}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Bairro
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalBairro(e.target.value)}
                    type="text"
                    value={fiscalBairro}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">
                    Complemento
                  </label>
                  <input
                    className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
                    disabled={isSubmitting}
                    onChange={(e) => setFiscalComplemento(e.target.value)}
                    type="text"
                    value={fiscalComplemento}
                  />
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <small className="font-medium text-zinc-400">
                Necessário para emissão automática de NFS-e.
              </small>
              <Button
                className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200"
                disabled={isSubmitting}
                onClick={saveFiscalProfile}
              >
                Salvar
              </Button>
            </Card.Footer>
          </form>
        </Card>

        <Card>
          <Card.Body
            title={t("settings.profile.personal.account.id")}
            subtitle={t("settings.profile.personal.account.message")}
          >
            <div className="flex items-center justify-between px-6 py-4 space-x-5 font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:w-2/3 group">
              <span className="overflow-x-auto text-zinc-600 dark:text-zinc-300 select-all font-bold tracking-tight">{userCode}</span>
              <CopyToClipboard onCopy={copyToClipboard} text={userCode}>
                <button className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm border-white/0 group">
                  <DocumentDuplicateIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                </button>
              </CopyToClipboard>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body
            title={t("settings.language.label")}
            subtitle={t("settings.language.description")}
          >
            <div className="relative md:w-2/3">
              <select
                className="appearance-none w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all cursor-pointer"
                onChange={(e) => {
                  const lang = e.target.value;
                  i18n.changeLanguage(lang);
                  try {
                    localStorage.setItem('language', lang);
                  } catch (e) {
                  }
                  document.cookie = `language=${encodeURIComponent(lang)}; path=/; max-age=31536000; samesite=lax`;
                  document.documentElement.lang = lang;
                }}
                value={currentLang}
              >
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
              </select>
              <ChevronRightIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90 pointer-events-none" />
            </div>
          </Card.Body>
        </Card>

        <Card danger>
          <Card.Body
            title={t("settings.account.deactive.title")}
            subtitle={t("settings.account.deactive.description")}
          />
          <Card.Footer>
            <small className="font-medium text-red-400/80">
              {t("settings.account.deactive.message")}
            </small>
            <Button
              className="text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
              onClick={toggleModal}
            >
              {t("settings.account.action.deactive.label")}
            </Button>
          </Card.Footer>
          <Modal
            show={showModal}
            title="Deactivate Personal Account"
            toggle={toggleModal}
          >
            <div className="p-8 space-y-6">
              <p className="text-zinc-600 font-medium">
                {t("settings.account.action.deactive.label")}
              </p>
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-sm text-red-600 font-bold flex items-center gap-2">
                  <span className="text-lg">⚠️</span> {t("settings.account.deactive.message")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2">
                  Enter <span className="text-zinc-900 dark:text-white">{user.email}</span> to continue:
                </label>
                <input
                  className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:bg-white dark:focus:bg-zinc-800 focus:border-red-500/30 transition-all"
                  disabled={isSubmitting}
                  onChange={handleVerifyEmailChange}
                  type="email"
                  value={verifyEmail}
                />
              </div>
              <div className="pt-4">
                <Button
                  className="w-full text-white bg-red-600 hover:bg-red-700 py-4 shadow-xl shadow-red-500/20"
                  disabled={!verifiedEmail || isSubmitting}
                  onClick={deactivateAccount}
                >
                  <span className="font-bold">{t("settings.account.action.deactive.label")}</span>
                </Button>
              </div>
            </div>
          </Modal>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const options = await getAuthOptions();
  const session = await getServerSession(context.req, context.res, options);

  // Be resilient: check both userId and email for session validity
  const userId = session?.user?.userId || session?.user?.id;
  const userEmail = session?.user?.email;

  if (!session || (!userId && !userEmail)) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  try {
    let user = null;

    if (userId) {
      user = await getUser(userId);
    }

    // Fallback: fetch by email if userId didn't work
    if (!user && userEmail) {
      const prisma = (await import('@/prisma/index')).default;
      user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          email: true,
          name: true,
          userCode: true,
          fiscalProfile: {
            select: {
              documentType: true,
              document: true,
              name: true,
              email: true,
              phone: true,
              cep: true,
              uf: true,
              codigoMunicipio: true,
              logradouro: true,
              numero: true,
              complemento: true,
              bairro: true,
            },
          },
        },
      });
    }

    if (!user) {
      // Instead of 404, render the page with data from session as fallback
      return {
        props: {
          user: {
            email: userEmail || '',
            name: session?.user?.name || '',
            userCode: '',
            fiscalProfile: null,
          },
        },
      };
    }

    return {
      props: {
        user: {
          email: user.email || '',
          name: user.name || '',
          userCode: user.userCode || '',
          fiscalProfile: user.fiscalProfile || null,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching user for settings:', error);
    // Fallback gracefully with session data rather than redirecting away
    return {
      props: {
        user: {
          email: userEmail || '',
          name: session?.user?.name || '',
          userCode: '',
          fiscalProfile: null,
        },
      },
    };
  }
};

export default Settings;
