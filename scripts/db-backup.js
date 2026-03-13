const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const parseArgs = (argv) => {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
      continue;
    }
    args.set(key, next);
    i += 1;
  }
  return args;
};

const requireString = (value, name) => {
  const v = String(value || '').trim();
  if (!v) {
    throw new Error(`${name} is required`);
  }
  return v;
};

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = new Error(`${cmd} exited with status ${result.status}`);
    err.status = result.status;
    throw err;
  }
};

const nowStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const databaseUrl = String(args.get('database-url') || process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL || '').trim();
  const dockerImage = String(args.get('docker-image') || process.env.BACKUP_DOCKER_IMAGE || 'postgres:16-alpine').trim();
  const dockerNetwork = String(args.get('docker-network') || process.env.DOCKER_NETWORK || '').trim();
  const outArg = String(args.get('out') || process.env.BACKUP_FILE || '').trim();
  const isCheckOnly = Boolean(args.get('check'));

  if (isCheckOnly) {
    requireString(databaseUrl, 'DATABASE_URL (or BACKUP_DATABASE_URL)');
    run('docker', ['version']);
    run('docker', ['run', '--rm', dockerImage, 'pg_dump', '--version']);
    process.stdout.write('backup_check_ok\n');
    return;
  }

  requireString(databaseUrl, 'DATABASE_URL (or BACKUP_DATABASE_URL)');

  const backupsDir = path.join(process.cwd(), 'backups');
  const getOut = () => {
    if (!outArg) {
      return { dir: backupsDir, fileName: `db_${nowStamp()}.dump` };
    }

    const hasPath = outArg.includes('/') || outArg.includes('\\');
    const isAbs = path.isAbsolute(outArg);
    const dir = (isAbs || hasPath) ? (isAbs ? path.dirname(outArg) : path.resolve(process.cwd(), path.dirname(outArg))) : backupsDir;
    const base = path.basename(outArg);
    const fileName = path.extname(base) ? base : `${base}.dump`;
    return { dir, fileName };
  };

  const { dir: outDir, fileName } = getOut();
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, fileName);
  const containerOutPath = `/backups/${fileName}`;

  const dockerArgs = ['run', '--rm'];
  if (dockerNetwork) dockerArgs.push('--network', dockerNetwork);
  dockerArgs.push('-v', `${outDir}:/backups`, dockerImage);

  dockerArgs.push(
    'pg_dump',
    '--dbname',
    databaseUrl,
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--file',
    containerOutPath
  );

  run('docker', dockerArgs);
  process.stdout.write(`${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
