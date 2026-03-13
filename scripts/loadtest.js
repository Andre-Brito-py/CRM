const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part || !part.startsWith('--')) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith('--') ? next : true;
    args[key] = value;
    if (value !== true) i += 1;
  }
  return args;
};

const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const percent = (value) => `${(value * 100).toFixed(1)}%`;

const quantile = (sorted, q) => {
  if (!sorted.length) return 0;
  const pos = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
  return sorted[pos];
};

const ms = (n) => `${Math.round(n)}ms`;

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  npm run loadtest -- --baseUrl http://localhost:3000 --workspaceSlug <slug> --cookie "<cookie>"',
        '',
        'Options:',
        '  --baseUrl        Base URL (default: http://localhost:3000)',
        '  --workspaceSlug  Workspace slug (required)',
        '  --cookie         Cookie header value (or set env LOADTEST_COOKIE)',
        '  --vus            Virtual users (default: 10)',
        '  --durationSec    Duration in seconds (default: 30)',
        '',
      ].join('\n')
    );
    process.exit(0);
  }

  const baseUrl = String(args.baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const workspaceSlug = String(args.workspaceSlug || '').trim();
  const cookie = String(process.env.LOADTEST_COOKIE || args.cookie || '').trim();
  const vus = toPositiveInt(args.vus, 10);
  const durationSec = toPositiveInt(args.durationSec, 30);

  if (!workspaceSlug) {
    process.stderr.write('Missing --workspaceSlug\n');
    process.exit(2);
  }
  if (!cookie) {
    process.stderr.write('Missing auth cookie. Provide --cookie or env LOADTEST_COOKIE\n');
    process.exit(2);
  }

  const endpoints = [
    `/api/workspace/${encodeURIComponent(workspaceSlug)}/pipelines`,
    `/api/workspace/${encodeURIComponent(workspaceSlug)}/tasks?page=1&pageSize=25`,
    `/api/workspace/${encodeURIComponent(workspaceSlug)}/contacts?page=1&pageSize=25`,
    `/api/workspace/${encodeURIComponent(workspaceSlug)}/inbox?assigneeId=&status=&search=`,
    `/api/workspace/${encodeURIComponent(workspaceSlug)}/analytics?scope=whatsapp`,
  ];

  const startedAt = Date.now();
  const deadlineAt = startedAt + durationSec * 1000;

  const results = [];
  let requestCount = 0;
  let okCount = 0;
  let errorCount = 0;

  const runVu = async (vuIndex) => {
    let cursor = vuIndex % endpoints.length;
    while (Date.now() < deadlineAt) {
      const path = endpoints[cursor];
      cursor = (cursor + 1) % endpoints.length;
      const url = `${baseUrl}${path}`;
      const t0 = performance.now();
      let status = 0;
      let ok = false;
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            cookie,
            'user-agent': 'nextacular-loadtest/1.0',
          },
        });
        status = res.status;
        ok = res.ok;
        await res.arrayBuffer().catch(() => null);
      } catch {
        status = 0;
        ok = false;
      }
      const t1 = performance.now();
      const durationMs = t1 - t0;

      results.push({ durationMs, ok, status });
      requestCount += 1;
      if (ok) okCount += 1;
      else errorCount += 1;
    }
  };

  process.stdout.write(
    `Load test starting: vus=${vus} durationSec=${durationSec} baseUrl=${baseUrl} workspaceSlug=${workspaceSlug}\n`
  );

  await Promise.all(Array.from({ length: vus }, (_, i) => runVu(i)));

  const endedAt = Date.now();
  const elapsedMs = Math.max(1, endedAt - startedAt);
  const rps = requestCount / (elapsedMs / 1000);

  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const p50 = quantile(durations, 0.5);
  const p90 = quantile(durations, 0.9);
  const p95 = quantile(durations, 0.95);
  const p99 = quantile(durations, 0.99);

  process.stdout.write(
    [
      '',
      'Summary:',
      `  requests: ${requestCount}`,
      `  ok:       ${okCount} (${percent(okCount / Math.max(1, requestCount))})`,
      `  errors:   ${errorCount} (${percent(errorCount / Math.max(1, requestCount))})`,
      `  rps:      ${rps.toFixed(1)}`,
      `  p50:      ${ms(p50)}`,
      `  p90:      ${ms(p90)}`,
      `  p95:      ${ms(p95)}`,
      `  p99:      ${ms(p99)}`,
      '',
    ].join('\n')
  );

  if (errorCount > 0) process.exitCode = 1;
};

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err?.message || err)}\n`);
  process.exit(1);
});
