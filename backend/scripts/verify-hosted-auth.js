const {Client} = require('pg');
const {v4: uuidv4} = require('uuid');
const {hashPassword} = require('../dist/utils/auth');

const API_URL = 'https://betterbudget.onrender.com/api/v1';
const DATABASE_URL = process.argv[2];

if (!DATABASE_URL) {
  console.error('Usage: node scripts/verify-hosted-auth.js <database-url>');
  process.exit(1);
}

const password = 'TestPass123!';
const timestamp = Date.now();
const users = {
  verified: `phase1b-verified-${timestamp}@example.com`,
  validCode: `phase1a-valid-${timestamp}@example.com`,
  expiredCode: `phase1a-expired-${timestamp}@example.com`,
};

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: /rds\.amazonaws\.com/.test(DATABASE_URL) ? {rejectUnauthorized: false} : undefined,
});

async function request(label, path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {'Content-Type': 'application/json', ...(options.headers || {})},
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  console.log(label, response.status, body);
  return {response, body};
}

async function insertUser(email, {verified, code, expiresAt}) {
  await client.query(
    `INSERT INTO users
      (id, email, password_hash, verified, currency, verification_code, verification_code_expires_at, verification_code_sent_at)
     VALUES ($1, $2, $3, $4, 'USD', $5, $6, CURRENT_TIMESTAMP)`,
    [uuidv4(), email, hashPassword(password), verified, code || null, expiresAt || null],
  );
}

(async () => {
  await client.connect();

  try {
    await insertUser(users.verified, {verified: true});
    await insertUser(users.validCode, {
      verified: false,
      code: '123456',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await insertUser(users.expiredCode, {
      verified: false,
      code: '654321',
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    const login = await request('LOGIN_VERIFIED', '/auth/login', {
      method: 'POST',
      body: JSON.stringify({email: users.verified, password}),
    });
    const token = login.body?.data?.token;

    if (token) {
      await request('USERS_ME_AUTH', '/users/me', {
        headers: {Authorization: `Bearer ${token}`},
      });
      await request('BUDGETS_AUTH', '/budgets', {
        headers: {Authorization: `Bearer ${token}`},
      });
    }

    await request('USERS_ME_INVALID_TOKEN', '/users/me', {
      headers: {Authorization: 'Bearer invalid-token'},
    });
    await request('LOGIN_UNVERIFIED', '/auth/login', {
      method: 'POST',
      body: JSON.stringify({email: users.validCode, password}),
    });
    await request('VERIFY_INVALID_CODE', '/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({email: users.validCode, code: '000000'}),
    });
    await request('VERIFY_EXPIRED_CODE', '/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({email: users.expiredCode, code: '654321'}),
    });
    await request('VERIFY_VALID_CODE', '/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({email: users.validCode, code: '123456'}),
    });
    await request('RESEND_ALREADY_VERIFIED', '/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({email: users.verified}),
    });
    await request('SOCIAL_GOOGLE_FAKE_TOKEN', '/auth/social-login', {
      method: 'POST',
      body: JSON.stringify({provider: 'google', idToken: 'fake-token'}),
    });
  } finally {
    await client.query('DELETE FROM users WHERE email = ANY($1::text[])', [
      Object.values(users),
    ]);
    await client.end();
  }
})();
