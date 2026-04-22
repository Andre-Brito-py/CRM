import { InvitationStatus } from '@prisma/client';
import prisma from '@/prisma/index';
import { createAuditLog } from '@/lib/server/audit';

export const getMember = async (id) =>
  await prisma.member.findFirst({
    select: { teamRole: true },
    where: { id },
  });

export const getMembers = async (slug) =>
  await prisma.member.findMany({
    select: {
      id: true,
      email: true,
      status: true,
      teamRole: true,
      member: { select: { id: true, name: true, image: true } },
    },
    where: {
      deletedAt: null,
      workspace: {
        deletedAt: null,
        slug,
      },
    },
  });

export const getMembersByWorkspaceId = async (workspaceId) =>
  await prisma.member.findMany({
    select: {
      id: true,
      email: true,
      status: true,
      teamRole: true,
      member: { select: { id: true, name: true, image: true } },
    },
    where: {
      deletedAt: null,
      workspaceId,
      workspace: { deletedAt: null },
    },
  });

export const getPendingInvitations = async (email) =>
  await prisma.member.findMany({
    select: {
      id: true,
      email: true,
      joinedAt: true,
      status: true,
      teamRole: true,
      invitedBy: {
        select: {
          email: true,
          name: true,
        },
      },
      workspace: {
        select: {
          createdAt: true,
          inviteCode: true,
          name: true,
          slug: true,
          workspaceCode: true,
          creator: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
    where: {
      deletedAt: null,
      email,
      status: InvitationStatus.PENDING,
      workspace: { deletedAt: null },
    },
  });

export const remove = async (id, workspaceId, actorId) => {
  const member = await prisma.member.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { email: true }
  });
  if (!member) return null;

  const result = await prisma.member.update({
    data: { deletedAt: new Date() },
    where: { id },
  });

  if (actorId) {
    await createAuditLog(workspaceId, actorId, {
      action: 'MEMBER_REMOVED',
      title: `Member removed: ${member.email}`,
      target: id,
      metadata: { email: member.email }
    });
  }
  return result;
};

export const toggleRole = async (id, workspaceId, teamRole, actorId) => {
  const member = await prisma.member.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { email: true, teamRole: true }
  });
  if (!member) return null;

  const result = await prisma.member.update({
    data: { teamRole },
    where: { id },
  });

  if (actorId) {
    await createAuditLog(workspaceId, actorId, {
      action: 'MEMBER_ROLE_UPDATED',
      title: `Member ${member.email} role changed from ${member.teamRole} to ${teamRole}`,
      target: id,
      metadata: { email: member.email, oldRole: member.teamRole, newRole: teamRole }
    });
  }
  return result;
};

export const updateStatus = async (id, status) =>
  await prisma.member.update({
    data: { status },
    where: { id },
  });
