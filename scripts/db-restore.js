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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const backupFileArg = String(args.get('file') || process.env.BACKUP_FILE || '').trim();
  const restoreUrl = String(args.get('restore-url') || process.env.RESTORE_DATABASE_URL || '').trim();
  const sourceUrl = String(process.env.DATABASE_URL || '').trim();
  const dockerImage = String(args.get('docker-image') || process.env.BACKUP_DOCKER_IMAGE || 'postgres:16-alpine').trim();
  const dockerNetwork = String(args.get('docker-network') || process.env.DOCKER_NETWORK || '').trim();
  const confirm = String(args.get('confirm') || process.env.CONFIRM_RESTORE || '').trim();
  const isCheckOnly = Boolean(args.get('check'));

  const backupFileName = requireString(backupFileArg, '--file (or BACKUP_FILE)');
  const safeRestoreUrl = restoreUrl ? requireString(restoreUrl, '--restore-url (or RESTORE_DATABASE_URL)') : '';

  const backupsDir = path.join(process.cwd(), 'backups');
  const hostFilePath = path.isAbsolute(backupFileName)
    ? backupFileName
    : path.join(backupsDir, backupFileName);

  if (isCheckOnly) {
    run('docker', ['version']);
    run('docker', ['run', '--rm', dockerImage, 'pg_restore', '--version']);
    if (!fs.existsSync(hostFilePath)) {
      throw new Error(`Backup file not found: ${hostFilePath}`);
    }
    process.stdout.write('restore_check_ok\n');
    return;
  }

  requireString(safeRestoreUrl, '--restore-url (or RESTORE_DATABASE_URL)');

  if (sourceUrl && sourceUrl === safeRestoreUrl && confirm !== 'YES') {
    throw new Error('Refusing to restore into DATABASE_URL without CONFIRM_RESTORE=YES');
  }
  if (confirm !== 'YES') {
    throw new Error('CONFIRM_RESTORE=YES is required');
  }

  if (!fs.existsSync(hostFilePath)) {
    throw new Error(`Backup file not found: ${hostFilePath}`);
  }

  const mountDir = path.dirname(hostFilePath);
  const dockerArgs = ['run', '--rm'];
  if (dockerNetwork) dockerArgs.push('--network', dockerNetwork);
  dockerArgs.push('-v', `${mountDir}:/backups`, dockerImage);

  dockerArgs.push(
    'pg_restore',
    '--dbname',
    safeRestoreUrl,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    `/backups/${path.basename(hostFilePath)}`
  );

  run('docker', dockerArgs);
  process.stdout.write('restore_ok\n');
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
