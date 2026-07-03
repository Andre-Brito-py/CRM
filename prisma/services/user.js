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

export const deleteUserCompletely = async (id, email) => {
  await prisma.$transaction(async (tx) => {
    // 1. Delete sessions and accounts
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.account.deleteMany({ where: { userId: id } });

    // 2. Delete verification tokens
    await tx.emailVerificationToken.deleteMany({ where: { userId: id } });

    // 3. Delete activities and usage events
    await tx.activity.deleteMany({ where: { userId: id } });
    await tx.aiUsageEvent.deleteMany({ where: { userId: id } });
    await tx.whatsAppUsageEvent.deleteMany({ where: { userId: id } });

    // 4. Delete notifications and support messages/tickets
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.supportMessage.deleteMany({ where: { senderId: id } });
    await tx.supportTicket.deleteMany({
      where: {
        OR: [
          { creatorId: id },
          { assigneeId: id }
        ]
      }
    });

    // 5. Delete internal chat
    await tx.internalChatMessage.deleteMany({ where: { senderId: id } });
    await tx.internalChatChannel.deleteMany({
      where: {
        OR: [
          { userAId: id },
          { userBId: id }
        ]
      }
    });
    await tx.internalChatBridge.deleteMany({ where: { creatorId: id } });

    // 6. Nullify assignee on deals, tasks, conversations
    await tx.conversation.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
    await tx.deal.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
    await tx.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });

    // 7. Delete domains added by user
    await tx.domain.deleteMany({ where: { addedById: id } });

    // 8. Delete memberships and invitations
    await tx.member.deleteMany({
      where: {
        OR: [
          { email },
          { inviter: email }
        ]
      }
    });

    // 9. Delete fiscal profile and documents
    await tx.fiscalDocument.deleteMany({ where: { userId: id } });
    await tx.fiscalProfile.deleteMany({ where: { userId: id } });

    // 10. Delete customer payment
    await tx.customerPayment.deleteMany({ where: { customerId: id } });

    // 11. Finally delete the user
    await tx.user.delete({ where: { id: id } });
  });
};
