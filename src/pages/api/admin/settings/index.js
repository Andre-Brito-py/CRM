import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import { encryptSecret, isEncryptedValue } from '@/lib/server/config';
import { ensureRequestId } from '@/lib/server/request-id';
import { log, reportError } from '@/lib/server/logger';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

const SECRET_KEYS = new Set([
  'OPENAI_API_KEY',
  'PAYMENTS_SECRET_KEY',
  'PAYMENTS_SIGNING_SECRET',
  'STRIPE_WEBHOOK_SECRET',
  'EMAIL_SERVER_PASSWORD',
  'ASAAS_API_KEY',
  'ASAAS_WEBHOOK_TOKEN',
  'GOOGLE_CLIENT_SECRET',
  'FOCUS_NFE_API_KEY',
  'FOCUSNFE_TOKEN',
  'VERCEL_AUTH_BEARER_TOKEN',
  'AWS_S3_ACCESS_KEY_ID',
  'AWS_S3_SECRET_ACCESS_KEY',
  'VAPID_PRIVATE_KEY',
  'CRON_SECRET',
]);

const isSecretKey = (key) => SECRET_KEYS.has(String(key || '').toUpperCase());

const handler = async (req, res) => {
  const requestId = ensureRequestId(req, res);
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
    const safeConfigs = configs.map((c) => {
      const secret = isSecretKey(c.key);
      const set = Boolean(c.value) && String(c.value).trim().length > 0;
      return {
        id: c.id,
        key: c.key,
        category: c.category,
        updatedAt: c.updatedAt,
        isSecret: secret,
        isEncrypted: secret ? isEncryptedValue(c.value) : false,
        isSet: secret ? set : true,
        value: secret ? '' : c.value,
      };
    });
    return res.status(200).json({ data: { configs: safeConfigs } });
  } else if (req.method === 'POST') {
    const { key, value, category, clear } = req.body || {};

    const normalizedKey = String(key || '').trim().toUpperCase();
    if (!normalizedKey) {
      return res.status(400).json({ error: { msg: 'Missing key' } });
    }

    try {
      if (clear) {
        await prisma.systemConfig.deleteMany({ where: { key: normalizedKey } });
        await createPlatformAuditActivity(
          session.user.userId || session.user.id,
          session.user.email,
          {
            action: 'SYSTEM_CONFIG_CLEAR',
            title: 'System config cleared',
            target: { key: normalizedKey },
            metadata: { isSecret: isSecretKey(normalizedKey) },
          },
          req
        );
        return res.status(200).json({ data: { cleared: true } });
      }

      const secret = isSecretKey(normalizedKey);
      const strValue = value === undefined || value === null ? '' : String(value);

      if (secret && strValue.trim().length === 0) {
        const existing = await prisma.systemConfig.findUnique({ where: { key: normalizedKey } });
        return res.status(200).json({
          data: {
            config: existing
              ? {
                id: existing.id,
                key: existing.key,
                category: existing.category,
                updatedAt: existing.updatedAt,
                isSecret: true,
                isEncrypted: isEncryptedValue(existing.value),
                isSet: true,
                value: '',
              }
              : {
                id: null,
                key: normalizedKey,
                category: category || 'GENERAL',
                updatedAt: null,
                isSecret: true,
                isEncrypted: false,
                isSet: false,
                value: '',
              },
          },
        });
      }

      if (!secret && strValue.trim().length === 0) {
        return res.status(400).json({ error: { msg: 'Missing value' } });
      }

      const storedValue = secret ? encryptSecret(strValue.trim(), normalizedKey) : strValue;

      const saved = await prisma.systemConfig.upsert({
        where: { key: normalizedKey },
        update: { value: storedValue, category: category || 'GENERAL' },
        create: { key: normalizedKey, value: storedValue, category: category || 'GENERAL' },
      });

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'SYSTEM_CONFIG_UPSERT',
          title: 'System config saved',
          target: { key: normalizedKey },
          metadata: { category: saved.category, isSecret: secret },
        },
        req
      );

      return res.status(200).json({
        data: {
          config: {
            id: saved.id,
            key: saved.key,
            category: saved.category,
            updatedAt: saved.updatedAt,
            isSecret: secret,
            isEncrypted: secret ? isEncryptedValue(saved.value) : false,
            isSet: secret ? true : true,
            value: secret ? '' : saved.value,
          },
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'failed to save system config', requestId, err: error });
      reportError(error, { requestId, route: 'admin/settings', op: 'upsert' });
      return res.status(500).json({ error: { msg: 'Failed to save config' } });
    }
  } else if (req.method === 'DELETE') {
    const { key } = req.body;
    try {
      const normalizedKey = String(key || '').trim().toUpperCase();
      await prisma.systemConfig.delete({ where: { key: normalizedKey } });
      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'SYSTEM_CONFIG_DELETE',
          title: 'System config deleted',
          target: { key: normalizedKey },
          metadata: { isSecret: isSecretKey(normalizedKey) },
        },
        req
      );
      return res.status(200).json({ data: { success: true } });
    } catch (error) {
      log({ level: 'error', msg: 'failed to delete system config', requestId, err: error });
      reportError(error, { requestId, route: 'admin/settings', op: 'delete' });
      return res.status(500).json({ error: { msg: 'Failed to delete config' } });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: { msg: `Method ${req.method} Not Allowed` } });
  }
};

export default handler;
