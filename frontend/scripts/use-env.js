const fs = require('fs');
const path = require('path');

const envName = process.argv[2];
const allowed = new Set(['development', 'production']);

if (!allowed.has(envName)) {
  console.error('Usage: node scripts/use-env.js <development|production>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, `.env.${envName}`);
const target = path.join(root, '.env');

if (!fs.existsSync(source)) {
  console.error(`Missing ${path.basename(source)}. Create it from ${path.basename(source)}.example first.`);
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`Using ${path.basename(source)} for Expo environment.`);
