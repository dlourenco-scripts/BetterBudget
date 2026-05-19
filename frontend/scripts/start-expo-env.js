const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');

const envName = process.argv[2];
const extraArgs = process.argv.slice(3);
const aliases = {
  development: 'local',
  dev: 'local',
  prod: 'production',
};
const resolvedEnvName = aliases[envName] || envName;
const allowed = new Set(['local', 'staging', 'production']);

if (!allowed.has(resolvedEnvName)) {
  console.error('Usage: node scripts/start-expo-env.js <local|staging|production> [expo args...]');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, `.env.${resolvedEnvName}`);
const target = path.join(root, '.env');

if (!fs.existsSync(source)) {
  console.error(`Missing ${path.basename(source)}. Create it from ${path.basename(source)}.example first.`);
  process.exit(1);
}

function parseEnvFile(filePath) {
  const result = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal && /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(entry.address)) {
        return entry.address;
      }
    }
  }
  return '';
}

fs.copyFileSync(source, target);

const fileEnv = parseEnvFile(source);
const childEnv = {
  ...process.env,
  ...fileEnv,
  EXPO_NO_DOTENV: '1',
  EXPO_NO_DEPENDENCY_VALIDATION: '1',
  EXPO_NO_TELEMETRY: '1',
  HTTP_PROXY: '',
  HTTPS_PROXY: '',
  ALL_PROXY: '',
  NO_PROXY: [
    'localhost',
    '127.0.0.1',
    '::1',
    process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getLanIp(),
  ]
    .filter(Boolean)
    .join(','),
};

if (!childEnv.REACT_NATIVE_PACKAGER_HOSTNAME) {
  const lanIp = getLanIp();
  if (lanIp) {
    childEnv.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  }
}

const expoArgs = ['expo', 'start', '--lan', '--clear', ...extraArgs];

console.log(`Using ${path.basename(source)} for Expo environment.`);
console.log(`API: ${childEnv.EXPO_PUBLIC_API_URL || '(auto/local fallback)'}`);
if (childEnv.REACT_NATIVE_PACKAGER_HOSTNAME) {
  console.log(`Expo LAN host: ${childEnv.REACT_NATIVE_PACKAGER_HOSTNAME}`);
}

const child = spawn('npx', expoArgs, {
  cwd: root,
  env: childEnv,
  shell: true,
  stdio: 'inherit',
});

child.on('exit', code => {
  process.exit(code || 0);
});
