import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Set it in backend/.env locally or in AWS/App Runner.');
}

const databaseSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false');

// PostgreSQL connection configuration. Local development uses backend/.env;
// AWS/App Runner injects DATABASE_URL at runtime.
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseSsl ? { rejectUnauthorized: false } : false,
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database schema
const initializeSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        profile_image TEXT,
        verified BOOLEAN NOT NULL DEFAULT false,
        currency TEXT NOT NULL DEFAULT 'USD',
        theme TEXT NOT NULL DEFAULT 'light',
        language TEXT NOT NULL DEFAULT 'en',
        payday_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
        payday_reminder_time TEXT DEFAULT '09:00',
        subscription_plan TEXT NOT NULL DEFAULT 'free',
        onboarding_complete BOOLEAN NOT NULL DEFAULT false,
        goal_type TEXT NOT NULL DEFAULT 'save',
        savings_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
        verification_code TEXT,
        verification_code_expires_at TIMESTAMP,
        verification_code_sent_at TIMESTAMP,
        reset_code TEXT,
        reset_code_expires_at TIMESTAMP,
        reset_code_sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create budgets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        net_pay DECIMAL(10,2) NOT NULL,
        cycle_type TEXT NOT NULL,
        cycle_start TEXT NOT NULL,
        cycle_end TEXT NOT NULL,
        reserve_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        current_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
        savings_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
        goal_type TEXT NOT NULL DEFAULT 'save',
        auto_fill_enabled BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create incomes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL,
        frequency TEXT NOT NULL,
        received_date DATE NOT NULL,
        category TEXT NOT NULL,
        notes TEXT,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'Every Pay Cycle',
        due_date DATE NOT NULL,
        category TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create debts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        balance DECIMAL(10,2) NOT NULL,
        minimum_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
        interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create generated pay-cycle records. Budgets act as templates; cycles
    // represent actual pay periods generated from the template schedule.
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_cycles (
        id TEXT PRIMARY KEY,
        budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        cycle_index INTEGER NOT NULL,
        cycle_start DATE NOT NULL,
        cycle_end DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned',
        base_income DECIMAL(10,2) NOT NULL DEFAULT 0,
        extra_income DECIMAL(10,2) NOT NULL DEFAULT 0,
        manual_additional_income DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_income DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
        reserve_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        goal_type TEXT NOT NULL DEFAULT 'save',
        goal_allocation DECIMAL(10,2) NOT NULL DEFAULT 0,
        carry_over_in DECIMAL(10,2) NOT NULL DEFAULT 0,
        carry_over_out DECIMAL(10,2) NOT NULL DEFAULT 0,
        spendable_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (budget_id, cycle_index)
      )
    `);

    await client.query(`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'Every Pay Cycle'
    `);

    await client.query(`
      ALTER TABLE budgets
      ADD COLUMN IF NOT EXISTS current_savings DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_image TEXT
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS savings_goal DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_code_sent_at TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_code_sent_at TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE budgets
      ADD COLUMN IF NOT EXISTS savings_goal DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE incomes
      ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      ALTER TABLE budget_cycles
      ADD COLUMN IF NOT EXISTS carry_over_in DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE budget_cycles
      ADD COLUMN IF NOT EXISTS carry_over_out DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE budget_cycles
      ADD COLUMN IF NOT EXISTS manual_additional_income DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS allocations (
        id TEXT PRIMARY KEY,
        budget_cycle_id TEXT NOT NULL REFERENCES budget_cycles(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id TEXT,
        amount DECIMAL(10,2) NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        notes TEXT,
        applied_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      ALTER TABLE allocations
      ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP
    `);

    await client.query('COMMIT');
    console.log('Database schema initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database schema:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Initialize schema on startup
initializeSchema().catch(console.error);

// Export the pool for use in other modules
export default pool;
