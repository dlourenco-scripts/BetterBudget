const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const mockDb = {
  async query(sql, params = []) {
    const compactSql = sql.replace(/\s+/g, ' ').trim();

    if (compactSql.startsWith('SELECT id FROM users WHERE id = $1')) {
      return {
        rows: ['user-1', 'owner-user'].includes(params[0]) ? [{id: params[0]}] : [],
      };
    }

    if (compactSql.startsWith('SELECT id, status FROM budgets WHERE id = $1 AND user_id = $2')) {
      if (params[1] !== 'owner-user') {
        return {rows: []};
      }
      if (params[0] === 'inactive-budget') {
        return {rows: [{id: 'inactive-budget', status: 'inactive'}]};
      }
      if (params[0] === 'active-budget') {
        return {rows: [{id: 'active-budget', status: 'active'}]};
      }
      return {rows: []};
    }

    if (compactSql.startsWith('SELECT id, goal_type, status FROM budgets WHERE id = $1 AND user_id = $2')) {
      if (params[1] !== 'owner-user') {
        return {rows: []};
      }
      if (params[0] === 'inactive-budget') {
        return {rows: [{id: 'inactive-budget', goal_type: 'debt', status: 'inactive'}]};
      }
      if (params[0] === 'active-budget') {
        return {rows: [{id: 'active-budget', goal_type: 'debt', status: 'active'}]};
      }
      return {rows: []};
    }

    if (
      compactSql.includes('FROM budgets') &&
      compactSql.includes('WHERE id = $1 AND user_id = $2')
    ) {
      return {
        rows:
          params[0] === 'budget-1' && params[1] === 'owner-user'
            ? [{id: 'budget-1', user_id: 'owner-user'}]
            : [],
      };
    }

    if (compactSql.startsWith('INSERT INTO expenses')) {
      return {
        rows: [
          {
            id: params[0],
            budget_id: params[1],
            name: params[2],
            amount: params[3],
            type: params[4],
            frequency: params[5],
            due_date: params[6],
            category: params[7],
            priority: params[8],
            notes: params[9],
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
    }

    if (compactSql.startsWith('INSERT INTO debts')) {
      return {
        rows: [
          {
            id: params[0],
            budget_id: params[1],
            name: params[2],
            balance: params[3],
            minimum_payment: params[4],
            interest_rate: params[5],
            priority: params[6],
            status: params[7],
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
    }

    throw new Error(`Unhandled query: ${compactSql}`);
  },
};

function loadBudgetRouter() {
  const dbPath = require.resolve('../dist/db.js');
  const budgetPath = require.resolve('../dist/routes/budgets.js');
  delete require.cache[dbPath];
  delete require.cache[budgetPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {__esModule: true, default: mockDb},
  };
  return require(budgetPath).default;
}

async function withServer(callback) {
  const app = express();
  app.use(express.json());
  app.use('/budgets', loadBudgetRouter());
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function request(baseUrl, method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return {status: response.status, data};
}

test('budget create rejects invalid date input with 400', async () => {
  await withServer(async baseUrl => {
    const {createToken} = require('../dist/utils/auth.js');
    const token = createToken('user-1');
    const response = await request(baseUrl, 'POST', '/budgets', token, {
      name: 'Beta Budget',
      netPay: 1000,
      cycleType: 'Biweekly',
      cycleStart: 'not-a-date',
      cycleEnd: '2026-05-15',
    });

    assert.equal(response.status, 400);
    assert.equal(response.data.success, false);
  });
});

test('budget lookup for another user returns 404 instead of leaking data', async () => {
  await withServer(async baseUrl => {
    const {createToken} = require('../dist/utils/auth.js');
    const token = createToken('user-1');
    const response = await request(baseUrl, 'GET', '/budgets/budget-1', token);

    assert.equal(response.status, 404);
    assert.match(response.data.message, /not found/i);
  });
});

test('inactive budgets reject money mutations but remain readable', async () => {
  await withServer(async baseUrl => {
    const {createToken} = require('../dist/utils/auth.js');
    const token = createToken('owner-user');
    const response = await request(baseUrl, 'POST', '/budgets/inactive-budget/expenses', token, {
      name: 'Should Not Save',
      amount: 25,
      type: 'one-time',
      dueDate: '2026-05-18',
      category: 'Other',
      priority: 1,
    });

    assert.equal(response.status, 403);
    assert.equal(response.data.success, false);
    assert.match(response.data.message, /inactive budgets are read-only/i);
  });
});

test('expense priority accepts high medium low labels for compatibility', async () => {
  await withServer(async baseUrl => {
    const {createToken} = require('../dist/utils/auth.js');
    const token = createToken('owner-user');
    const response = await request(baseUrl, 'POST', '/budgets/active-budget/expenses', token, {
      name: 'Mapped Priority',
      amount: 25,
      type: 'one-time',
      dueDate: '2026-05-18',
      category: 'Other',
      priority: 'high',
    });

    assert.equal(response.status, 201);
    assert.equal(response.data.data.priority, 1);
  });
});

test('debt priority accepts high medium low labels for compatibility', async () => {
  await withServer(async baseUrl => {
    const {createToken} = require('../dist/utils/auth.js');
    const token = createToken('owner-user');
    const response = await request(baseUrl, 'POST', '/budgets/active-budget/debts', token, {
      name: 'Mapped Debt Priority',
      balance: 500,
      minimumPayment: 25,
      interestRate: 10,
      priority: 'low',
    });

    assert.equal(response.status, 201);
    assert.equal(response.data.data.priority, 3);
  });
});
