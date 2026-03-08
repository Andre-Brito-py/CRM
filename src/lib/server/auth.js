import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';

import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { emailConfig, sendMail } from '@/lib/server/mail';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session: async ({ session, token, user }) => {
      if (session.user) {
        // If using JWT, user comes from token. If using Database, user is the User object.
        // We can fetch fresh data from DB to be sure.
        const userEmail = session.user.email;
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true, role: true, email: true }
        });

        if (dbUser) {
          session.user.userId = dbUser.id;
          session.user.role = dbUser.role;
          
          const customerPayment = await getPayment(dbUser.email);
          if (customerPayment) {
            session.user.subscription = customerPayment.subscriptionType;
          }
        }
      }

      return session;
    },
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
    EmailProvider({
      from: process.env.EMAIL_FROM,
      server: emailConfig,
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
    jwt: true,
  },
};
