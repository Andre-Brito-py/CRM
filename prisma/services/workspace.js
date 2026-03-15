import { InvitationStatus, TeamRole } from '@prisma/client';
import slugify from 'slugify';

import {
  html as createHtml,
  text as createText,
} from '@/config/email-templates/workspace-create';
import {
  html as inviteHtml,
  text as inviteText,
} from '@/config/email-templates/invitation';
import { sendMail } from '@/lib/server/mail';
import prisma from '@/prisma/index';

export const countWorkspaces = async (slug) =>
  await prisma.workspace.count({
    where: { slug: { startsWith: slug } },
  });

export const createWorkspace = async (creatorId, email, name, slug) => {
  const count = await countWorkspaces(slug);

  if (count > 0) {
    slug = `${slug}-${count}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      creator: { connect: { id: creatorId } },
      members: {
        create: {
          email,
          inviter: email,
          status: InvitationStatus.ACCEPTED,
          teamRole: TeamRole.OWNER,
        },
      },
      name,
      slug,
    },
  });
  await sendMail({
    html: createHtml({ code: workspace.inviteCode, name }),
    subject: `[Closify] Workspace created: ${name}`,
    text: createText({ code: workspace.inviteCode, name }),
    to: email,
  });
};

export const deleteWorkspace = async (id, email, slug) => {
  const workspace = await getOwnWorkspace(id, email, slug);

  if (workspace) {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const conversations = await tx.conversation.findMany({
        select: { id: true },
        where: { workspaceId: workspace.id },
      });
      const conversationIds = conversations.map((c) => c.id);

      if (conversationIds.length > 0) {
        await tx.message.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
      }

      await tx.webhookDelivery.deleteMany({
        where: { webhook: { workspaceId: workspace.id } },
      });

      await Promise.all([
        tx.webhook.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.apiKey.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.integration.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.workspacePaymentSetting.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.platformSubscription.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.npsResponse.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.npsSurvey.deleteMany({ where: { workspaceId: workspace.id } }),
        tx.automationJob.deleteMany({ where: { workspaceId: workspace.id } }),
      ]);

      await Promise.all([
        tx.conversation.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, externalId: null },
        }),
        tx.payment.updateMany({
          where: { workspaceId: workspace.id },
          data: {
            deletedAt: now,
            description: null,
            providerPaymentId: null,
            paymentLink: null,
            invoiceUrl: null,
            paymentUrl: null,
          },
        }),
        tx.task.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, title: 'Deleted', content: null },
        }),
        tx.deal.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, name: 'Deleted', amount: null, customFields: null },
        }),
        tx.contact.updateMany({
          where: { workspaceId: workspace.id },
          data: {
            deletedAt: now,
            name: 'Deleted',
            email: null,
            phone: null,
            jobTitle: null,
            asaasCustomerId: null,
            customFields: null,
          },
        }),
        tx.company.updateMany({
          where: { workspaceId: workspace.id },
          data: {
            deletedAt: now,
            name: 'Deleted',
            website: null,
            industry: null,
            customFields: null,
          },
        }),
        tx.domain.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now },
        }),
        tx.tag.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, name: 'Deleted', color: null },
        }),
        tx.pipeline.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, name: 'Deleted' },
        }),
        tx.stage.updateMany({
          where: { pipeline: { workspaceId: workspace.id } },
          data: { deletedAt: now, name: 'Deleted', color: null },
        }),
        tx.messageTemplate.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, name: 'Deleted', content: '' },
        }),
        tx.automationRule.updateMany({
          where: { workspaceId: workspace.id },
          data: { deletedAt: now, isActive: false, name: 'Deleted', triggerConfig: null, actionConfig: null },
        }),
        tx.activity.deleteMany({
          where: {
            workspaceId: workspace.id,
            NOT: { type: { startsWith: 'AUDIT_' } },
          },
        }),
      ]);

      await tx.member.deleteMany({ where: { workspaceId: workspace.id } });

      await tx.workspace.update({
        data: { deletedAt: now, name: 'Deleted workspace', customFieldDefinitions: null },
        where: { id: workspace.id },
      });
    });
    return slug;
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const getInvitation = async (inviteCode) =>
  await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
      workspaceCode: true,
      slug: true,
    },
    where: {
      deletedAt: null,
      inviteCode,
    },
  });

export const getOwnWorkspace = async (id, email, slug) =>
  await prisma.workspace.findFirst({
    select: {
      id: true,
      inviteCode: true,
      name: true,
    },
    where: {
      OR: [
        { id },
        {
          members: {
            some: {
              deletedAt: null,
              teamRole: TeamRole.OWNER,
              email,
            },
          },
        },
      ],
      AND: {
        deletedAt: null,
        slug,
      },
    },
  });

export const getSiteWorkspace = async (slug, customDomain) =>
  await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      domains: { select: { name: true } },
    },
    where: {
      OR: [
        { slug },
        customDomain
          ? {
            domains: {
              some: {
                name: slug,
                deletedAt: null,
              },
            },
          }
          : undefined,
      ],
      AND: { deletedAt: null },
    },
  });

export const getWorkspace = async (id, email, slug) =>
  await prisma.workspace.findFirst({
    select: {
      id: true,
      creatorId: true,
      name: true,
      inviteCode: true,
      slug: true,
      workspaceCode: true,
      customFieldDefinitions: true,
      aiContext: true,
      creator: { select: { email: true, customerPayment: true } },
      members: {
        select: {
          email: true,
          teamRole: true,
        },
      },
    },
    where: {
      OR: [
        { id },
        {
          members: {
            some: {
              email,
              deletedAt: null,
            },
          },
        },
      ],
      AND: {
        deletedAt: null,
        slug,
      },
    },
  });

export const getWorkspaces = async (id, email) =>
  await prisma.workspace.findMany({
    select: {
      createdAt: true,
      creator: {
        select: {
          email: true,
          name: true,
        },
      },
      inviteCode: true,
      members: {
        select: {
          member: {
            select: {
              email: true,
              image: true,
              name: true,
            },
          },
          joinedAt: true,
          status: true,
          teamRole: true,
        },
      },
      name: true,
      slug: true,
      workspaceCode: true,
    },
    where: {
      OR: [
        { id },
        {
          members: {
            some: {
              email,
              deletedAt: null,
              status: InvitationStatus.ACCEPTED,
            },
          },
        },
      ],
      AND: { deletedAt: null },
    },
  });

export const getWorkspacePaths = async () => {
  const [workspaces, domains] = await Promise.all([
    prisma.workspace.findMany({
      select: { slug: true },
      where: { deletedAt: null },
    }),
    prisma.domain.findMany({
      select: { name: true },
      where: { deletedAt: null },
    }),
  ]);
  return [
    ...workspaces.map((workspace) => ({
      params: { site: workspace.slug },
    })),
    ...domains.map((domain) => ({
      params: { site: domain.name },
    })),
  ];
};

export const inviteUsers = async (id, email, members, slug) => {
  const workspace = await getOwnWorkspace(id, email, slug);
  const inviter = email;

  if (workspace) {
    const membersList = members.map(({ email, role }) => ({
      email,
      inviter,
      teamRole: role,
    }));
    const data = members.map(({ email }) => ({
      createdAt: null,
      email,
    }));
    await Promise.all([
      prisma.user.createMany({
        data,
        skipDuplicates: true,
      }),
      prisma.workspace.update({
        data: {
          members: {
            createMany: {
              data: membersList,
              skipDuplicates: true,
            },
          },
        },
        where: { id: workspace.id },
      }),
      sendMail({
        html: inviteHtml({ code: workspace.inviteCode, name: workspace.name }),
        subject: `[Nextacular] You have been invited to join ${workspace.name} workspace`,
        text: inviteText({ code: workspace.inviteCode, name: workspace.name }),
        to: members.map((member) => member.email),
      }),
    ]);
    return membersList;
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const isWorkspaceCreator = (id, creatorId) => id === creatorId;

export const isWorkspaceOwner = (email, workspace) => {
  let isTeamOwner = false;
  const member = workspace.members.find(
    (member) => member.email === email && member.teamRole === TeamRole.OWNER
  );

  if (member) {
    isTeamOwner = true;
  }

  return isTeamOwner;
};

export const joinWorkspace = async (workspaceCode, email) => {
  const workspace = await prisma.workspace.findFirst({
    select: {
      creatorId: true,
      id: true,
    },
    where: {
      deletedAt: null,
      workspaceCode,
    },
  });

  if (workspace) {
    await prisma.member.upsert({
      create: {
        workspaceId: workspace.id,
        email,
        inviter: workspace.creatorId,
        status: InvitationStatus.ACCEPTED,
      },
      update: {},
      where: { email },
    });
    return new Date();
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const updateName = async (id, email, name, slug) => {
  const workspace = await getOwnWorkspace(id, email, slug);

  if (workspace) {
    await prisma.workspace.update({
      data: { name },
      where: { id: workspace.id },
    });
    return name;
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const updateSlug = async (id, email, newSlug, pathSlug) => {
  let slug = slugify(newSlug.toLowerCase());
  const count = await countWorkspaces(slug);

  if (count > 0) {
    slug = `${slug}-${count}`;
  }

  const workspace = await getOwnWorkspace(id, email, pathSlug);

  if (workspace) {
    await prisma.workspace.update({
      data: { slug },
      where: { id: workspace.id },
    });
    return slug;
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const updateAiContext = async (id, email, aiContext, slug) => {
  const workspace = await getOwnWorkspace(id, email, slug);

  if (workspace) {
    await prisma.workspace.update({
      data: { aiContext },
      where: { id: workspace.id },
    });
    return aiContext;
  } else {
    throw new Error('Unable to find workspace');
  }
};
