const key = "AIzaSyBNZzYzNdnGlFwpId7HcPbCv_IQpUQ7WhY";
const models = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-pro-latest"
];

async function run() {
  console.log('Testing key:', key.slice(0, 10) + '...');
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`[SUCCESS] ${model}: `, data.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        console.log(`[FAILED] ${model}: `, data.error?.message?.split('*')[0] || "Unknown error");
      }
    } catch (e) {
      console.log(`[ERROR] ${model}: `, e.message);
    }
  }
}

run();
