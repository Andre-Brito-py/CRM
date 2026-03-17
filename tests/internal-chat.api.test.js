jest.mock('@/config/api-validation', () => ({
  validateSession: jest.fn(),
}));

jest.mock('@/prisma/services/workspace', () => ({
  getWorkspace: jest.fn(),
  isWorkspaceOwner: jest.fn(),
}));

jest.mock('@/prisma/services/internalChat', () => ({
  listChannelsForUser: jest.fn(),
  getOrCreateDmChannel: jest.fn(),
  listMessages: jest.fn(),
  createMessage: jest.fn(),
  listBridgesForWorkspace: jest.fn(),
  createBridgeBetweenWorkspaces: jest.fn(),
  deleteBridgeForWorkspace: jest.fn(),
}));

jest.mock('@/prisma/services/membership', () => ({
  getMembersByWorkspaceId: jest.fn(),
}));

jest.mock('@/prisma/index', () => ({
  __esModule: true,
  default: {
    member: {
      findFirst: jest.fn(),
    },
    internalChatChannel: {
      findFirst: jest.fn(),
    },
    internalChatBridge: {
      findFirst: jest.fn(),
    },
  },
}));

import { InvitationStatus } from '@prisma/client';
import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import {
  listChannelsForUser,
  createMessage,
  listBridgesForWorkspace,
  deleteBridgeForWorkspace,
} from '@/prisma/services/internalChat';
import { getMembersByWorkspaceId } from '@/prisma/services/membership';

import channelsHandler from '@/pages/api/workspace/[workspaceSlug]/internal-chat/channels/index';
import dmHandler from '@/pages/api/workspace/[workspaceSlug]/internal-chat/dm';
import membersHandler from '@/pages/api/workspace/[workspaceSlug]/internal-chat/members';
import messagesHandler from '@/pages/api/workspace/[workspaceSlug]/internal-chat/channels/[channelId]/messages';
import bridgesHandler from '@/pages/api/workspace/[workspaceSlug]/internal-chat/bridges/index';
import bridgeHandler from '@/pages/api/workspace/[workspaceSlug]/internal-chat/bridges/[bridgeId]';

const createReqRes = ({ method = 'GET', query = {}, body = {} } = {}) => {
  const req = { method, query, body, headers: {} };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
};

describe('Internal Chat API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateSession.mockResolvedValue({
      user: { id: 'u_1', userId: 'u_1', email: 'me@example.com', name: 'Me' },
    });
    getWorkspace.mockResolvedValue({ id: 'w_1', slug: 'acme', members: [{ email: 'me@example.com', teamRole: 'OWNER' }] });
    prisma.member.findFirst.mockResolvedValue({ id: 'm_1' });
    isWorkspaceOwner.mockReturnValue(true);
  });

  test('channels GET returns team + dms', async () => {
    listChannelsForUser.mockResolvedValue({
      teamChannel: { id: 'ch_team', key: 'team', kind: 'TEAM' },
      dmChannels: [{ id: 'ch_dm', key: 'dm:u_1:u_2', kind: 'DIRECT' }],
    });

    const { req, res } = createReqRes({ query: { workspaceSlug: 'acme' } });
    await channelsHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(listChannelsForUser).toHaveBeenCalledWith({ workspaceId: 'w_1', userId: 'u_1' });
    expect(res.body?.data?.teamChannel?.id).toBe('ch_team');
  });

  test('members GET returns accepted members only', async () => {
    getMembersByWorkspaceId.mockResolvedValue([
      { status: InvitationStatus.ACCEPTED, teamRole: 'OWNER', member: { id: 'u_1', email: 'me@example.com', name: 'Me', image: null } },
      { status: InvitationStatus.ACCEPTED, teamRole: 'MEMBER', member: { id: 'u_2', email: 'you@example.com', name: 'You', image: null } },
      { status: InvitationStatus.PENDING, teamRole: 'MEMBER', member: { id: 'u_3', email: 'pending@example.com', name: 'Pending', image: null } },
    ]);

    const { req, res } = createReqRes({ query: { workspaceSlug: 'acme' } });
    await membersHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.members?.map((m) => m.id)).toEqual(['u_1', 'u_2']);
  });

  test('dm POST denies when target not in workspace', async () => {
    prisma.member.findFirst.mockResolvedValueOnce({ id: 'm_1' }).mockResolvedValueOnce(null);

    const { req, res } = createReqRes({
      method: 'POST',
      query: { workspaceSlug: 'acme' },
      body: { targetUserId: 'u_2' },
    });
    await dmHandler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('messages GET denies non-participant in DIRECT channel', async () => {
    prisma.internalChatChannel.findFirst.mockResolvedValue({
      id: 'ch_dm',
      kind: 'DIRECT',
      userAId: 'u_2',
      userBId: 'u_3',
    });

    const { req, res } = createReqRes({
      method: 'GET',
      query: { workspaceSlug: 'acme', channelId: 'ch_dm' },
    });
    await messagesHandler(req, res);

    expect(res.statusCode).toBe(403);
  });

  test('messages POST sends message', async () => {
    prisma.internalChatChannel.findFirst.mockResolvedValue({
      id: 'ch_team',
      kind: 'TEAM',
      userAId: null,
      userBId: null,
    });
    createMessage.mockResolvedValue({ message: { id: 'msg_1', content: 'Oi' } });

    const { req, res } = createReqRes({
      method: 'POST',
      query: { workspaceSlug: 'acme', channelId: 'ch_team' },
      body: { content: 'Oi' },
    });
    await messagesHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'w_1', channelId: 'ch_team', authorId: 'u_1', content: 'Oi' })
    );
  });

  test('bridges POST requires owner', async () => {
    isWorkspaceOwner.mockReturnValue(false);

    const { req, res } = createReqRes({
      method: 'POST',
      query: { workspaceSlug: 'acme' },
      body: { otherWorkspaceSlug: 'other' },
    });
    await bridgesHandler(req, res);

    expect(res.statusCode).toBe(403);
  });

  test('bridges GET lists connections', async () => {
    listBridgesForWorkspace.mockResolvedValue([
      {
        id: 'b_1',
        name: 'Conn',
        createdAt: new Date().toISOString(),
        createdById: 'u_1',
        workspaces: [{ workspace: { id: 'w_1', name: 'Acme', slug: 'acme' } }],
      },
    ]);

    const { req, res } = createReqRes({ query: { workspaceSlug: 'acme' } });
    await bridgesHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.bridges?.[0]?.id).toBe('b_1');
  });

  test('bridge DELETE requires owner', async () => {
    isWorkspaceOwner.mockReturnValue(false);

    const { req, res } = createReqRes({
      method: 'DELETE',
      query: { workspaceSlug: 'acme', bridgeId: 'b_1' },
    });
    await bridgeHandler(req, res);

    expect(res.statusCode).toBe(403);
  });

  test('bridge DELETE soft-deletes bridge', async () => {
    deleteBridgeForWorkspace.mockResolvedValue({ id: 'b_1' });

    const { req, res } = createReqRes({
      method: 'DELETE',
      query: { workspaceSlug: 'acme', bridgeId: 'b_1' },
    });
    await bridgeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(deleteBridgeForWorkspace).toHaveBeenCalledWith({ bridgeId: 'b_1', workspaceId: 'w_1' });
  });
});
