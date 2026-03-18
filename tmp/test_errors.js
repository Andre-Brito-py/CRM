require('dotenv').config();
const { log, reportError } = require('../src/lib/server/logger');

async function test() {
  console.log('--- Testing Logger ---');
  log({ level: 'error', msg: 'Test Error Message from Agent', context: { test: true, time: new Date().toISOString() } });
  
  console.log('--- Testing reportError ---');
  try {
    throw new Error('Manual Exception for Sentry and Admin UI Test');
  } catch (err) {
    reportError(err, { source: 'test-script', userId: 'agent-123' });
  }

  console.log('Wait a few seconds for async persistence...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Done.');
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
