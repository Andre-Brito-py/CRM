import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';

import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { sendMail } from '@/lib/server/mail';
import { getSystemConfig } from '@/lib/server/config';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';
import { rateLimit } from '@/lib/server/rateLimit';

export const authOptions = {
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
  providers: [
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
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
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || null,
  session: {
    strategy: 'jwt',
  },
};
