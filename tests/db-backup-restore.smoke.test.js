const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const hasDocker = () => {
  const r = spawnSync('docker', ['version'], { stdio: 'ignore' });
  return r.status === 0;
};

const runNode = (args, env) => {
  const r = spawnSync(process.execPath, args, {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const err = new Error(r.stderr || `command failed: ${args.join(' ')}`);
    err.stdout = r.stdout;
    err.stderr = r.stderr;
    throw err;
  }
  return r.stdout || '';
};

describe('db backup/restore (docker)', () => {
  const sourceUrl = process.env.DATABASE_URL || '';
  const restoreUrl = process.env.RESTORE_DATABASE_URL || '';
  const enabled = process.env.RUN_DB_BACKUP_RESTORE_TEST === '1';

  const shouldRun = enabled && Boolean(sourceUrl) && Boolean(restoreUrl) && hasDocker();

  const testOrSkip = shouldRun ? test : test.skip;

  testOrSkip('backs up and restores into restore database', async () => {
    jest.setTimeout(10 * 60 * 1000);

    const repoRoot = path.resolve(__dirname, '..');
    const scriptsDir = path.join(repoRoot, 'scripts');
    const backupsDir = path.join(repoRoot, 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    runNode([path.join(scriptsDir, 'db-backup.js'), '--check'], { DATABASE_URL: sourceUrl });

    const fileName = `jest_${Date.now()}.dump`;
    const out = runNode(
      [path.join(scriptsDir, 'db-backup.js'), '--database-url', sourceUrl, '--out', fileName],
      {}
    ).trim();

    const expectedPath = path.join(backupsDir, fileName);
    expect(out.endsWith(expectedPath)).toBe(true);
    expect(fs.existsSync(expectedPath)).toBe(true);

    runNode(
      [
        path.join(scriptsDir, 'db-restore.js'),
        '--file',
        fileName,
        '--restore-url',
        restoreUrl,
        '--confirm',
        'YES',
      ],
      { CONFIRM_RESTORE: 'YES' }
    );

    const prisma = new PrismaClient({ datasources: { db: { url: restoreUrl } } });
    try {
      const r = await prisma.$queryRaw`SELECT 1 as ok`;
      expect(Array.isArray(r)).toBe(true);
    } finally {
      await prisma.$disconnect();
    }
  });
});
