import { TOTP } from 'otplib';
import QRCode from 'qrcode';
import prisma from '@/prisma/index';
import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/server/auth';

export default async function handler(req, res) {
  const report = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
    },
    libraries: {
      otplib: 'checking...',
      qrcode: 'checking...',
    },
    database: 'checking...',
    session: 'checking...',
  };

  try {
    // 1. Test OTPLIB
    try {
      const { NobleCryptoPlugin, ScureBase32Plugin } = await import('otplib');
      const totp = new TOTP({ crypto: NobleCryptoPlugin, base32: ScureBase32Plugin });
      const secret = totp.generateSecret();
      const uri = totp.generateURI({ issuer: 'Test', label: 'test@test.com', secret });
      report.libraries.otplib = { ok: true, secretLength: secret.length, uriStarts: uri.substring(0, 10) };
    } catch (e) {
      report.libraries.otplib = { ok: false, error: e.message };
    }

    // 2. Test QRCode
    try {
      const svg = await QRCode.toString('otpauth://test', { type: 'svg' });
      report.libraries.qrcode = { ok: true, svgLength: svg.length };
    } catch (e) {
      report.libraries.qrcode = { ok: false, error: e.message };
    }

    // 3. Test Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      report.database = { ok: true };
    } catch (e) {
      report.database = { ok: false, error: e.message };
    }

    // 4. Test Session
    try {
      const opts = await getAuthOptions(req);
      const session = await getServerSession(req, res, opts);
      report.session = { ok: true, active: !!session, userId: session?.user?.id || 'none' };
    } catch (e) {
      report.session = { ok: false, error: e.message };
    }

    res.status(200).json(report);
  } catch (globalError) {
    res.status(500).json({
      error: 'CRITICAL_FAILURE',
      message: globalError.message,
      stack: globalError.stack,
      partialReport: report
    });
  }
}
