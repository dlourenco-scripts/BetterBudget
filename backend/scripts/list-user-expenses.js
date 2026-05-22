const {Client} = require('pg');

const [databaseUrl, email] = process.argv.slice(2);

if (!databaseUrl || !email) {
  console.error('Usage: node scripts/list-user-expenses.js <database-url> <email>');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: /rds\.amazonaws\.com/.test(databaseUrl) ? {rejectUnauthorized: false} : undefined,
});

(async () => {
  await client.connect();
  const result = await client.query(
    `
      select
        u.email,
        b.name as budget,
        e.name as expense,
        e.amount,
        e.due_date,
        e.notes,
        e.created_at,
        e.updated_at
      from users u
      join budgets b on b.user_id = u.id
      left join expenses e on e.budget_id = b.id
      where u.email = $1
      order by b.name, e.created_at nulls last
    `,
    [email],
  );
  console.table(result.rows);
  await client.end();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
