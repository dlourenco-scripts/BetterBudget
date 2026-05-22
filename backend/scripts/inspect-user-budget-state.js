const {Client} = require('pg');

const [databaseUrl, email] = process.argv.slice(2);

if (!databaseUrl || !email) {
  console.error('Usage: node scripts/inspect-user-budget-state.js <database-url> <email>');
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
        b.id as budget_id,
        b.name,
        b.net_pay,
        b.goal_type,
        b.auto_fill_enabled,
        bc.id as cycle_id,
        bc.cycle_start,
        bc.cycle_end,
        bc.status,
        bc.base_income,
        bc.goal_allocation,
        bc.carry_over_out,
        bc.remaining_amount,
        d.id as debt_id,
        d.name as debt_name,
        d.balance,
        d.minimum_payment,
        d.status as debt_status
      from budgets b
      join budget_cycles bc on bc.budget_id = b.id
      left join debts d on d.budget_id = b.id
      where b.user_id = (select id from users where email = $1)
      order by b.name, bc.cycle_start desc
      limit 30
    `,
    [email],
  );

  console.table(result.rows);
  await client.end();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
