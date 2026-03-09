import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';

import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { sendMail } from '@/lib/server/mail';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session: async ({ session, token, user }) => {
      if (session.user || token) {
        // If using JWT, user comes from token. If using Database, user is the User object.
        // We can fetch fresh data from DB to be sure.
        const userEmail = session?.user?.email || token?.email;
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true, role: true, email: true, twoFactorEnabled: true }
        });

        if (dbUser) {
          if (!session.user) session.user = {};
          session.user.userId = dbUser.id;
          session.user.role = dbUser.role;
          session.user.email = dbUser.email;
          session.user.twoFactorEnabled = dbUser.twoFactorEnabled;

          const customerPayment = await getPayment(dbUser.email);
          if (customerPayment) {
            session.user.subscription = customerPayment.subscriptionType;
          }
        }
      }

      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    }
  },
  debug: !(process.env.NODE_ENV === 'production'),
  events: {
    signIn: async ({ user, isNewUser }) => {
      const customerPayment = await getPayment(user.email);

      if (isNewUser || customerPayment === null || user.createdAt === null) {
        await Promise.all([createPaymentAccount(user.email, user.id)]);
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error('No user found or password not set (use magic link to login and set a password)');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        if (!user.emailVerified) {
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
        await sendMail({
          html: html({ email, url }),
          subject: `[Nextacular] Sign in to ${host}`,
          text: text({ email, url }),
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
