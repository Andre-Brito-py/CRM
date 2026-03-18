import crypto from 'crypto';

jest.mock('@/lib/server/mail', () => ({
  sendMail: jest.fn(),
}));

jest.mock('@/lib/server/config', () => ({
  getSystemConfig: jest.fn(),
}));

jest.mock('@/lib/server/logger', () => ({
  log: jest.fn(),
  reportError: jest.fn(),
}));

jest.mock('@/lib/server/rateLimit', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/prisma/index', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    verificationToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { sendMail } from '@/lib/server/mail';
import { getSystemConfig } from '@/lib/server/config';
import { rateLimit } from '@/lib/server/rateLimit';
import prisma from '@/prisma/index';

import forgotPasswordHandler from '@/pages/api/auth/forgot-password';
import resetPasswordHandler from '@/pages/api/auth/reset-password';

const createReqRes = ({ method = 'POST', headers = {}, body = {} } = {}) => {
  const req = { method, headers, body };
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

describe('Password reset endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.mockResolvedValue({ ok: true });
    getSystemConfig.mockResolvedValue('https://app.closify.com');
  });

  test('forgot-password returns generic ok and sends email for credential user', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u_1', email: 'user@example.com', password: 'hashed' });
    prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    prisma.verificationToken.create.mockResolvedValue({ identifier: 'x', token: 'y' });
    sendMail.mockResolvedValue({ messageId: 'm_1' });

    const { req, res } = createReqRes({
      headers: { 'x-request-id': 'req_1' },
      body: { email: 'user@example.com' },
    });

    await forgotPasswordHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('Recuperação'),
        html: expect.stringContaining('/auth/reset-password?email=user%40example.com'),
      })
    );
  });

  test('forgot-password does not send email for unknown user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const { req, res } = createReqRes({
      body: { email: 'missing@example.com' },
    });

    await forgotPasswordHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(0);
  });

  test('reset-password rejects invalid token', async () => {
    const { req, res } = createReqRes({
      body: { email: 'user@example.com', token: 'short', password: 'Senha123456' },
    });

    await resetPasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('reset-password updates password when token is valid', async () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');

    prisma.verificationToken.findFirst.mockResolvedValue({ identifier: 'password-reset:user@example.com', token: tokenHash });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    const { req, res } = createReqRes({
      body: { email: 'user@example.com', token: rawToken, password: 'Senha123456' },
    });

    await resetPasswordHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.verificationToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          identifier: 'password-reset:user@example.com',
          token: tokenHash,
        }),
      })
    );
    expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'password-reset:user@example.com' } });
  });
});

