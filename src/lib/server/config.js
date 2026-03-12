import prisma from '@/prisma/index';
import crypto from 'crypto';

const ENC_PREFIX = 'enc:v1:';

const getEncryptionKey = () => {
  const raw = process.env.CONFIG_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!raw) return null;
  return crypto.createHash('sha256').update(String(raw)).digest();
};

export const isEncryptedValue = (value) =>
  typeof value === 'string' && value.startsWith(ENC_PREFIX);

export const encryptSecret = (plaintext, aad = '') => {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error('Missing CONFIG_ENCRYPTION_KEY (or NEXTAUTH_SECRET)');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
};

export const decryptSecret = (encrypted, aad = '') => {
  if (!isEncryptedValue(encrypted)) return encrypted;

  const key = getEncryptionKey();
  if (!key) {
    throw new Error('Missing CONFIG_ENCRYPTION_KEY (or NEXTAUTH_SECRET)');
  }

  const payload = String(encrypted).slice(ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted config payload');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  if (aad) decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString('utf8');
};

export const decryptIfEncrypted = (value, aad = '') => {
  try {
    return decryptSecret(value, aad);
  } catch (error) {
    console.warn(`Failed to decrypt config value (${aad || 'unknown'}):`, error);
    return null;
  }
};

export const getSystemConfig = async (key, defaultValue = null) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (config) {
      const value = decryptIfEncrypted(config.value, key);
      return value ?? defaultValue;
    }
  } catch (error) {
    console.warn(`Failed to fetch system config for ${key}:`, error);
  }

  // Fallback to environment variable
  return process.env[key] || defaultValue;
};

export const upsertSystemConfig = async ({ key, value, category = 'GENERAL', encrypt = false }) => {
  const storedValue = encrypt ? encryptSecret(value, key) : String(value);
  return await prisma.systemConfig.upsert({
    where: { key },
    update: { value: storedValue, category },
    create: { key, value: storedValue, category },
  });
};
