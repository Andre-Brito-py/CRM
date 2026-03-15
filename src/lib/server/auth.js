import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';

import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { sendMail } from '@/lib/server/mail';
import { getSystemConfig } from '@/lib/server/config';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';
import { rateLimit } from '@/lib/server/rateLimit';
import getStripe from '@/lib/server/stripe';

let cachedGoogleOauthAt = 0;
let cachedGoogleOauth = null;

const getGoogleOauthConfig = async () => {
  const now = Date.now();
  if (cachedGoogleOauth && now - cachedGoogleOauthAt < 60_000) return cachedGoogleOauth;

  const [clientIdRaw, clientSecretRaw] = await Promise.all([
    getSystemConfig('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
    getSystemConfig('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET),
  ]);

  const clientId = String(clientIdRaw || '').trim();
  const clientSecret = String(clientSecretRaw || '').trim();
  const ok = clientId.length > 0 && clientSecret.length > 0;

  cachedGoogleOauthAt = now;
  cachedGoogleOauth = { ok, clientId, clientSecret };
  return cachedGoogleOauth;
};

const createCredentialsProvider = () =>
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      token2fa: { label: "2FA Token", type: "text" }
    },
    async authorize(credentials, req) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Please enter an email and password');
      }

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const normalizedEmail = String(credentials.email || '').trim().toLowerCase();
      const isTruthy = (value) => {
        const v = String(value || '').trim().toLowerCase();
        return v === 'true' || v === '1' || v === 'yes' || v === 'on';
      };

      if (req) {
        const rlIp = await rateLimit({ req, limit: 60, windowMs: 5 * 60_000 });
        if (!rlIp.ok) {
          throw new Error('Too Many Requests');
        }
        const rlEmail = await rateLimit({ req, limit: 15, windowMs: 5 * 60_000, key: `auth:login:email:${normalizedEmail}` });
        if (!rlEmail.ok) {
          throw new Error('Too Many Requests');
        }
      }

      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          }
        }
      });

      if (!user || !user.password) {
        await sleep(250);
        throw new Error('No user found or password not set (use magic link to login and set a password)');
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

      if (!isPasswordValid) {
        await sleep(250);
        throw new Error('Invalid password');
      }

      if (!user.emailVerified) {
        await sleep(250);
        throw new Error('Please verify your email address first');
      }

      if (user.twoFactorEnabled) {
        if (!credentials.token2fa) {
          throw new Error('2FA_REQUIRED');
        }

        if (!user.twoFactorSecret) {
          throw new Error('2FA secret is missing. Please contact support.');
        }

        const isValidToken = authenticator.check(credentials.token2fa, user.twoFactorSecret);

        if (!isValidToken) {
          await sleep(200);
          throw new Error('Invalid 2FA code');
        }
      }

      const requireCardOnSignup = isTruthy(
        await getSystemConfig(
          'PAYMENTS_REQUIRE_CARD_ON_SIGNUP',
          process.env.PAYMENTS_REQUIRE_CARD_ON_SIGNUP ?? 'true'
        )
      );
      if (requireCardOnSignup && user.role !== 'SUPERADMIN') {
        const paymentsSecretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
        if (paymentsSecretKey) {
          let customerPayment = await getPayment(user.email);
          if (!customerPayment) {
            await createPaymentAccount(user.email, user.id);
            customerPayment = await getPayment(user.email);
          }
          if (!customerPayment?.paymentId) {
            throw new Error('PAYMENT_METHOD_REQUIRED');
          }

          const stripe = await getStripe();
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customerPayment.paymentId,
            type: 'card',
            limit: 1,
          });
          const hasCard = Array.isArray(paymentMethods?.data) && paymentMethods.data.length > 0;
          if (!hasCard) {
            throw new Error('PAYMENT_METHOD_REQUIRED');
          }
        }
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    }
  });

const createEmailProvider = () =>
  EmailProvider({
    sendVerificationRequest: async ({ identifier: email, url }) => {
      const { host } = new URL(url);
      const emailFrom = await getSystemConfig('EMAIL_FROM', process.env.EMAIL_FROM);
      await sendMail({
        html: html({ email, url, from: emailFrom }),
        subject: `[Closify] Sign in to ${host}`,
        text: text({ email, url, from: emailFrom }),
        to: email,
      });
    },
  });

const buildBaseAuthOptions = () => ({
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session: async ({ session, token }) => {
      if (token) {
        if (!session.user) session.user = {};
        session.user.id = token.id || null;
        session.user.userId = token.id || null;
        session.user.role = token.role || null;
        session.user.email = token.email || null;
        session.user.twoFactorEnabled = token.twoFactorEnabled || false;
        session.user.subscription = token.subscription || null;
        session.user.termsVersion = token.termsVersion || null;
        session.user.termsAcceptedAt = token.termsAcceptedAt || null;
      }
      return session;
    },
    jwt: async ({ token, user }) => {
      const userId = user?.id || token?.id || null;
      if (!userId) return token;

      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      const requiredTermsVersion =
        process.env.TERMS_VERSION || process.env.NEXT_PUBLIC_TERMS_VERSION || '2026-03-13';
      const shouldRefresh =
        Boolean(user) ||
        !token.role ||
        !token.email ||
        !token.termsAcceptedAt ||
        token.termsVersion !== requiredTermsVersion;

      if (!shouldRefresh) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, twoFactorEnabled: true, email: true, termsVersion: true, termsAcceptedAt: true },
      });

      if (!dbUser) return token;

      token.role = dbUser.role;
      token.email = dbUser.email;
      token.twoFactorEnabled = dbUser.twoFactorEnabled;
      token.termsVersion = dbUser.termsVersion || null;
      token.termsAcceptedAt = dbUser.termsAcceptedAt ? new Date(dbUser.termsAcceptedAt).toISOString() : null;

      if (dbUser.role === 'SUPERADMIN') {
        token.subscription = 'PREMIUM';
      } else if (user || !token.subscription) {
        const customerPayment = await getPayment(dbUser.email);
        if (customerPayment) {
          token.subscription = customerPayment.subscriptionType;
        }
      }

      return token;
    }
  },
  debug: !(process.env.NODE_ENV === 'production'),
  events: {
    signIn: async ({ user, isNewUser }) => {
      const customerPayment = await getPayment(user.email);
      const paymentsSecretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);

      if (isNewUser || customerPayment === null || user.createdAt === null) {
        if (!paymentsSecretKey) return;
        try {
          await Promise.all([createPaymentAccount(user.email, user.id)]);
        } catch (error) {
          console.error('Error creating Stripe customer payment account:', error);
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || null,
  session: {
    strategy: 'jwt',
  },
});

export const getAuthOptions = async () => {
  const providers = [];
  const google = await getGoogleOauthConfig();
  if (google.ok) {
    providers.push(
      GoogleProvider({
        clientId: google.clientId,
        clientSecret: google.clientSecret,
      })
    );
  }

  providers.push(createCredentialsProvider());
  providers.push(createEmailProvider());

  return { ...buildBaseAuthOptions(), providers };
};

export const authOptions = {
  ...buildBaseAuthOptions(),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
      : []),
    createCredentialsProvider(),
    createEmailProvider(),
  ],
};
