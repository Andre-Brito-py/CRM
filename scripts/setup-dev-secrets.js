const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = new Set(process.argv.slice(2));
const envPath = path.join(process.cwd(), '.env.local');

const ensureLine = (content, key, value) => {
  const re = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*=`, 'mi');
  if (re.test(content)) return content;
  const next = content.length > 0 && !content.endsWith('\n') ? `${content}\n` : content;
  return `${next}${key}="${value}"\n`;
};

const hasKey = (content, key) => {
  const re = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*=`, 'mi');
  return re.test(content);
};

const readEnv = () => {
  if (!fs.existsSync(envPath)) return '';
  return fs.readFileSync(envPath, 'utf8');
};

if (args.has('--check')) {
  const content = readEnv();
  const ok =
    hasKey(content, 'NEXTAUTH_SECRET') && hasKey(content, 'CONFIG_ENCRYPTION_KEY');
  process.stdout.write(ok ? 'OK\n' : 'MISSING\n');
  process.exit(ok ? 0 : 1);
}

const nextauth = crypto.randomBytes(32).toString('base64');
const configKey = crypto.randomBytes(32).toString('base64');

let content = readEnv();
content = ensureLine(content, 'NEXTAUTH_SECRET', nextauth);
content = ensureLine(content, 'CONFIG_ENCRYPTION_KEY', configKey);

fs.writeFileSync(envPath, content, 'utf8');
process.stdout.write('DONE\n');
