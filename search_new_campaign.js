const fs = require('fs');
const content = fs.readFileSync('C:/Users/André/Documents/scoutly/frontend/src/App.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [newCampaign') || lines[i].includes('setNewCampaign({')) {
    console.log(`${i + 1}: ${lines[i]}`);
    for (let j = 1; j <= 10; j++) {
      console.log(`${i + 1 + j}: ${lines[i + j]}`);
    }
  }
}
