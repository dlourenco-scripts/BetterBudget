const {Client} = require('pg');
const {v4: uuidv4} = require('uuid');
const {hashPassword} = require('../dist/utils/auth');

const API_URL = 'https://betterbudget.onrender.com/api/v1';
const databaseUrl = process.argv[2];

if (!databaseUrl) {
  console.error('Usage: node scripts/verify-hosted-money-flow.js <database-url>');
  process.exit(1);
}

const email = `phase2b-money-${Date.now()}@example.com`;
const password = 'TestPass123!';
const client = new Client({
  connectionString: databaseUrl,
  ssl: /rds\.amazonaws\.com/.test(databaseUrl) ? {rejectUnauthorized: false} : undefined,
});

async function api(label, path, {token, ...options} = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  console.log(label, response.status, body?.success, body?.message || '');
  return {response, body};
}

(async () => {
  await client.connect();
  const userId = uuidv4();

  try {
    await client.query(
      `INSERT INTO users (id, email, password_hash, verified, currency, onboarding_complete)
       VALUES ($1, $2, $3, true, 'USD', true)`,
      [userId, email, hashPassword(password)],
    );

    const login = await api('LOGIN', '/auth/login', {
      method: 'POST',
      body: JSON.stringify({email, password}),
    });
    const token = login.body?.data?.token;
    if (!token) {
      throw new Error('No token returned from login.');
    }

    const budget = await api('CREATE_BUDGET', '/budgets', {
      token,
      method: 'POST',
      body: JSON.stringify({
        name: 'Money Flow Verification',
        netPay: 3000,
        cycleType: 'biweekly',
        cycleStart: '2026-05-19',
        cycleEnd: '2026-06-01',
        reserveAmount: 30,
        currentSavings: 100,
        savingsGoal: 1000,
        goalType: 'save',
        autoFillEnabled: false,
      }),
    });
    const budgetId = budget.body?.data?.id;
    if (!budgetId) {
      throw new Error('No budget id returned.');
    }

    await api('CREATE_EXPENSE', `/budgets/${budgetId}/expenses`, {
      token,
      method: 'POST',
      body: JSON.stringify({
        name: 'Rent',
        amount: 1200,
        type: 'Fixed Income',
        frequency: 'Every Pay Cycle',
        dueDate: '2026-05-20',
        category: 'Essentials',
        priority: 1,
        notes: 'Checking',
      }),
    });

    await api('CREATE_INCOME', `/budgets/${budgetId}/incomes`, {
      token,
      method: 'POST',
      body: JSON.stringify({
        name: 'Side Job',
        amount: 200,
        type: 'Additional Income',
        frequency: 'One Time',
        receivedDate: '2026-05-20',
        category: 'Additional',
        notes: 'Manual',
      }),
    });

    const debt = await api('CREATE_DEBT', `/budgets/${budgetId}/debts`, {
      token,
      method: 'POST',
      body: JSON.stringify({
        name: 'Card',
        balance: 500,
        minimumPayment: 25,
        interestRate: 0,
        priority: 1,
      }),
    });
    const debtId = debt.body?.data?.id;

    const detail = await api('GET_BUDGET_DETAIL', `/budgets/${budgetId}`, {token});
    const currentCycle = detail.body?.data?.cycles?.find(cycle => cycle.status === 'active') ||
      detail.body?.data?.cycles?.[0];
    console.log('DETAIL_TOTALS', {
      totalIncome: currentCycle?.totalIncome,
      totalExpenses: currentCycle?.totalExpenses,
      goalAllocation: currentCycle?.goalAllocation,
      carryOverOut: currentCycle?.carryOverOut,
      remainingAmount: currentCycle?.remainingAmount,
    });

    if (currentCycle?.id) {
      await api('UPDATE_CYCLE_CARRYOVER_MANUAL_INCOME_DEBT', `/budgets/${budgetId}/cycles/${currentCycle.id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          carryOverOut: 100,
          manualAdditionalIncome: 150,
          goalAllocation: 50,
          debtPayments: debtId ? {[debtId]: 25} : {},
        }),
      });
      const updated = await api('GET_BUDGET_DETAIL_AFTER_UPDATE', `/budgets/${budgetId}`, {token});
      const updatedCycle = updated.body?.data?.cycles?.find(cycle => cycle.id === currentCycle.id);
      console.log('UPDATED_TOTALS', {
        totalIncome: updatedCycle?.totalIncome,
        totalExpenses: updatedCycle?.totalExpenses,
        goalAllocation: updatedCycle?.goalAllocation,
        carryOverOut: updatedCycle?.carryOverOut,
        remainingAmount: updatedCycle?.remainingAmount,
        manualAdditionalIncome: updatedCycle?.manualAdditionalIncome,
      });
    }

    await api('MARK_BUDGET_INACTIVE', `/budgets/${budgetId}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({status: 'inactive'}),
    });
    await api('INACTIVE_CREATE_EXPENSE_SHOULD_FAIL', `/budgets/${budgetId}/expenses`, {
      token,
      method: 'POST',
      body: JSON.stringify({
        name: 'Blocked',
        amount: 1,
        type: 'Fixed Income',
        frequency: 'Every Pay Cycle',
        dueDate: '2026-05-21',
        category: 'Essentials',
      }),
    });
  } finally {
    await client.query('DELETE FROM users WHERE email = $1', [email]).catch(() => undefined);
    await client.end();
  }
})();
