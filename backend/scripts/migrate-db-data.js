const fs = require('fs');
const path = require('path');
const {Client} = require('pg');

const tables = ['users', 'budgets', 'budget_cycles', 'incomes', 'expenses', 'debts', 'allocations'];
const [sourceUrl, targetUrl] = process.argv.slice(2);

function usage() {
  console.error('Usage: node scripts/migrate-db-data.js <source-database-url> <target-database-url>');
  process.exit(1);
}

function sslFor(url) {
  return /rds\.amazonaws\.com/.test(url) ? {rejectUnauthorized: false} : undefined;
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function getColumns(client, table) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position
    `,
    [table],
  );

  return result.rows.map(row => row.column_name);
}

async function backupTarget(client) {
  const backup = {};

  for (const table of tables) {
    try {
      const result = await client.query(`select * from ${quoteIdentifier(table)}`);
      backup[table] = result.rows;
    } catch (error) {
      backup[table] = {error: error.message};
    }
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, {recursive: true});
  const file = path.join(backupDir, `rds-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  return file;
}

async function upsertTable(source, target, table) {
  const columns = await getColumns(source, table);
  if (!columns.length) {
    console.log(`${table}: skipped, source table missing`);
    return;
  }

  const targetColumns = await getColumns(target, table);
  const sharedColumns = columns.filter(column => targetColumns.includes(column));
  const rows = await source.query(`select ${sharedColumns.map(quoteIdentifier).join(', ')} from ${quoteIdentifier(table)}`);

  if (!rows.rowCount) {
    console.log(`${table}: 0 rows`);
    return;
  }

  const columnSql = sharedColumns.map(quoteIdentifier).join(', ');
  const valueSql = sharedColumns.map((_, index) => `$${index + 1}`).join(', ');
  const updateColumns = sharedColumns.filter(column => column !== 'id');
  const updateSql = updateColumns.length
    ? `do update set ${updateColumns
        .map(column => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
        .join(', ')}`
    : 'do nothing';

  const sql = `
    insert into ${quoteIdentifier(table)} (${columnSql})
    values (${valueSql})
    on conflict (id) ${updateSql}
  `;

  for (const row of rows.rows) {
    await target.query(sql, sharedColumns.map(column => row[column]));
  }

  console.log(`${table}: upserted ${rows.rowCount} rows`);
}

(async () => {
  if (!sourceUrl || !targetUrl) {
    usage();
  }

  const source = new Client({connectionString: sourceUrl, ssl: sslFor(sourceUrl)});
  const target = new Client({connectionString: targetUrl, ssl: sslFor(targetUrl)});

  await source.connect();
  await target.connect();

  try {
    const backupFile = await backupTarget(target);
    console.log(`Backed up target data to ${backupFile}`);

    await target.query('begin');
    for (const table of tables) {
      await upsertTable(source, target, table);
    }
    await target.query('commit');
    console.log('Migration complete.');
  } catch (error) {
    await target.query('rollback').catch(() => undefined);
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }
})();
