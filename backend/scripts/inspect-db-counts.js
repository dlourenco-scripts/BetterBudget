const {Client} = require('pg');

const tables = ['users', 'budgets', 'budget_cycles', 'incomes', 'expenses', 'debts', 'allocations'];
const urls = process.argv.slice(2);

function mask(url) {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}

async function inspect(url) {
  const ssl = /rds\.amazonaws\.com/.test(url) ? {rejectUnauthorized: false} : undefined;
  const client = new Client({connectionString: url, ssl});

  try {
    await client.connect();
    const db = await client.query('select current_database() as db');
    console.log(`OK ${mask(url)} db=${db.rows[0].db}`);

    for (const table of tables) {
      try {
        const count = await client.query(`select count(*)::int as count from ${table}`);
        console.log(`  ${table}: ${count.rows[0].count}`);
      } catch (error) {
        console.log(`  ${table}: missing`);
      }
    }
  } catch (error) {
    console.log(`NO ${mask(url)} ${error.message}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

(async () => {
  if (!urls.length) {
    console.error('Usage: node scripts/inspect-db-counts.js <database-url> [database-url...]');
    process.exit(1);
  }

  for (const url of urls) {
    await inspect(url);
  }
})();
