import { html, text } from '@/config/email-templates/email-update';
import { sendMail } from '@/lib/server/mail';
import prisma from '@/prisma/index';

export const deactivate = async (id) =>
  await prisma.user.update({
    data: { deletedAt: new Date() },
    where: { id },
  });

export const getUser = async (id) =>
  await prisma.user.findUnique({
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
    where: { id },
  });

export const updateEmail = async (id, email, previousEmail) => {
  await prisma.user.update({
    data: {
      email,
      emailVerified: null,
    },
    where: { id },
  });
  await sendMail({
    html: html({ email }),
    subject: `[Vysify] Email address updated`,
    text: text({ email }),
    to: [email, previousEmail],
  });
};

export const updateName = async (id, name) =>
  await prisma.user.update({
    data: { name },
    where: { id },
  });
