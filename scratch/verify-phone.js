const { normalizeWhatsAppNumber } = require('./src/lib/server/phone');

const testCases = [
  { input: '551187654321', expectedCanonical: '5511987654321', desc: 'BR 12-digit (no 9)' },
  { input: '5511987654321', expectedCanonical: '5511987654321', desc: 'BR 13-digit (with 9)' },
  { input: '+55 (11) 98765-4321', expectedCanonical: '5511987654321', desc: 'BR with formatting' },
  { input: '+14155552671', expectedCanonical: '14155552671', desc: 'International (US)' },
];

console.log('--- Starting Phone Normalization Tests ---');

testCases.forEach(({ input, expectedCanonical, desc }) => {
  const result = normalizeWhatsAppNumber(input);
  const success = result.clean === expectedCanonical;
  
  console.log(`[${success ? 'PASS' : 'FAIL'}] ${desc}`);
  console.log(`   Input: ${input}`);
  console.log(`   Expected: ${expectedCanonical}`);
  console.log(`   Actual: ${result.clean}`);
  console.log(`   Variations: ${result.variations.join(', ')}`);
  
  if (input.startsWith('55') || input.includes('55')) {
    const hasBoth = result.variations.some(v => v.includes('55118')) && result.variations.some(v => v.includes('55119'));
    if (hasBoth) {
      console.log(`   [OK] Both 12 and 13 digit variations generated.`);
    } else {
      console.log(`   [WARN] Missing cross-format variations for BR.`);
    }
  }
  console.log('');
});

console.log('--- End of Tests ---');
