const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const mockDb = {
  async query(sql, params = []) {
    const compactSql = sql.replace(/\s+/g, ' ').trim();

    if (compactSql.startsWith('SELECT id FROM users WHERE id = $1')) {
      return {rows: params[0] === 'user-1' ? [{id: 'user-1'}] : []};
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
