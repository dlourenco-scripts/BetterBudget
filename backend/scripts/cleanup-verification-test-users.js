const {Client} = require('pg');

const databaseUrl = process.argv[2];
if (!databaseUrl) {
  console.error('Usage: node scripts/cleanup-verification-test-users.js <database-url>');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: /rds\.amazonaws\.com/.test(databaseUrl) ? {rejectUnauthorized: false} : undefined,
});

(async () => {
  await client.connect();
  await client.query(
    `
      delete from users
      where email like 'verify-pass+%@example.com'
         or email like 'phase1%@example.com'
         or email like 'expiration-debug-%@example.com'
    `,
  );
  const result = await client.query('select email, verified, onboarding_complete from users order by email');
  console.table(result.rows);
  await client.end();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
