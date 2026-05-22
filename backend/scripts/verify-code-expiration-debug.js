const {Client} = require('pg');
const {v4: uuidv4} = require('uuid');
const {hashPassword} = require('../dist/utils/auth');

const databaseUrl = process.argv[2];
if (!databaseUrl) {
  console.error('Usage: node scripts/verify-code-expiration-debug.js <database-url>');
  process.exit(1);
}

const email = `expiration-debug-${Date.now()}@example.com`;
const password = 'TestPass123!';
const code = '222222';

const client = new Client({
  connectionString: databaseUrl,
  ssl: /rds\.amazonaws\.com/.test(databaseUrl) ? {rejectUnauthorized: false} : undefined,
});

(async () => {
  await client.connect();
  try {
    await client.query(
      `INSERT INTO users
        (id, email, password_hash, verified, currency, verification_code, verification_code_expires_at, verification_code_sent_at)
       VALUES ($1, $2, $3, false, 'USD', $4, CURRENT_TIMESTAMP + interval '15 minutes', CURRENT_TIMESTAMP)`,
      [uuidv4(), email, hashPassword(password), code],
    );

    const before = await client.query(
      `SELECT now() as db_now, verification_code_expires_at, verification_code_expires_at > now() as is_future
       FROM users WHERE email = $1`,
      [email],
    );
    console.log('DB_EXPIRATION_STATE', before.rows[0]);

    const response = await fetch('https://betterbudget.onrender.com/api/v1/auth/verify-email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, code}),
    });
    const body = await response.json();
    console.log('VERIFY_RESPONSE', response.status, body);
  } finally {
    await client.query('DELETE FROM users WHERE email = $1', [email]).catch(() => undefined);
    await client.end();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
