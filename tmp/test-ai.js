const { generateChatCompletion } = require('../src/lib/server/ai/index');

async function test() {
  try {
    const res = await generateChatCompletion({
      messages: [{ role: 'user', content: 'Say hello' }],
      systemPrompt: 'You are a helpful assistant.',
    });
    console.log('SUCCESS:', res);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
