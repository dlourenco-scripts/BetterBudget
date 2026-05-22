const fs = require('fs');
const path = require('path');
const {Client} = require('pg');

const [databaseUrl, keepEmail, mode = 'preview'] = process.argv.slice(2);

if (!databaseUrl || !keepEmail) {
  console.error('Usage: node scripts/prune-rds-users.js <database-url> <keep-email> [preview|apply]');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: /rds\.amazonaws\.com/.test(databaseUrl) ? {rejectUnauthorized: false} : undefined,
});

const tables = ['users', 'budgets', 'budget_cycles', 'incomes', 'expenses', 'debts', 'allocations'];

async function backup() {
  const data = {};
  for (const table of tables) {
    const result = await client.query(`select * from ${table}`);
    data[table] = result.rows;
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, {recursive: true});
  const file = path.join(backupDir, `rds-pre-prune-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

async function countsByUser() {
  const result = await client.query(
    `
      select
        u.id,
        u.email,
        u.verified,
        u.onboarding_complete,
        count(distinct b.id)::int as budgets,
        count(distinct bc.id)::int as cycles,
        count(distinct i.id)::int as incomes,
        count(distinct e.id)::int as expenses,
        count(distinct d.id)::int as debts
      from users u
      left join budgets b on b.user_id = u.id
      left join budget_cycles bc on bc.budget_id = b.id
      left join incomes i on i.budget_id = b.id
      left join expenses e on e.budget_id = b.id
      left join debts d on d.budget_id = b.id
      group by u.id, u.email, u.verified, u.onboarding_complete
      order by u.email
    `,
  );
  return result.rows;
}

(async () => {
  await client.connect();

  try {
    const keep = await client.query('select id, email from users where lower(email) = lower($1)', [keepEmail]);
    if (!keep.rowCount) {
      throw new Error(`Cannot prune: keep account not found for ${keepEmail}`);
    }

    const before = await countsByUser();
    console.table(before);

    if (mode !== 'apply') {
      console.log(`Preview only. Re-run with "apply" to delete every account except ${keepEmail}.`);
      return;
    }

    const backupFile = await backup();
    console.log(`Backed up RDS data to ${backupFile}`);

    await client.query('begin');
    const deleted = await client.query('delete from users where lower(email) <> lower($1) returning email', [keepEmail]);
    await client.query('commit');

    console.log('Deleted users:');
    console.table(deleted.rows);
    console.log('Remaining users:');
    console.table(await countsByUser());
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
})();
