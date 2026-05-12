const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const users = [];

function makeUser(overrides = {}) {
  return {
    id: overrides.id || `user-${users.length + 1}`,
    email: overrides.email || 'user@example.com',
    password_hash: overrides.password_hash || '',
    full_name: '',
    verified: false,
    currency: 'USD',
    theme: 'light',
    language: 'en',
    subscription_plan: 'free',
    onboarding_complete: false,
    goal_type: 'save',
    savings_goal: 0,
    verification_code: null,
    verification_code_expires_at: null,
    reset_code: null,
    reset_code_expires_at: null,
    ...overrides,
  };
}

const mockDb = {
  async query(sql, params = []) {
    const compactSql = sql.replace(/\s+/g, ' ').trim();

    if (compactSql.startsWith('SELECT id, verified FROM users WHERE email = $1')) {
      const user = users.find(item => item.email === params[0]);
      return {rows: user ? [{id: user.id, verified: user.verified}] : []};
    }

    if (compactSql.startsWith('SELECT * FROM users WHERE email = $1')) {
      const user = users.find(item => item.email === params[0]);
      return {rows: user ? [user] : []};
    }

    if (compactSql.startsWith('SELECT * FROM users WHERE id = $1')) {
      const user = users.find(item => item.id === params[0]);
      return {rows: user ? [user] : []};
    }

    if (compactSql.startsWith('SELECT id FROM users WHERE email = $1')) {
      const user = users.find(item => item.email === params[0]);
      return {rows: user ? [{id: user.id}] : []};
    }

    if (compactSql.startsWith('INSERT INTO users')) {
      users.push(
        makeUser({
          id: params[0],
          email: params[1],
          password_hash: params[2],
          verified: params[3],
          currency: params[4],
          verification_code: params[5],
          verification_code_expires_at: params[6],
        }),
      );
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET password_hash = $1, reset_code = NULL')) {
      const user = users.find(item => item.id === params[1]);
      Object.assign(user, {
        password_hash: params[0],
        reset_code: null,
        reset_code_expires_at: null,
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET password_hash = $1')) {
      const user = users.find(item => item.id === params[4]);
      Object.assign(user, {
        password_hash: params[0],
        currency: params[1],
        verification_code: params[2],
        verification_code_expires_at: params[3],
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET verified = true')) {
      const user = users.find(item => item.id === params[0]);
      Object.assign(user, {
        verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET verification_code = $1')) {
      const user = users.find(item => item.id === params[2]);
      Object.assign(user, {
        verification_code: params[0],
        verification_code_expires_at: params[1],
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET reset_code = $1')) {
      const user = users.find(item => item.id === params[2]);
      Object.assign(user, {
        reset_code: params[0],
        reset_code_expires_at: params[1],
      });
      return {rows: []};
    }

    throw new Error(`Unhandled query: ${compactSql}`);
  },
};

function loadAuthRouter() {
  const dbPath = require.resolve('../dist/db.js');
  const authPath = require.resolve('../dist/routes/auth.js');
  delete require.cache[dbPath];
  delete require.cache[authPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {__esModule: true, default: mockDb},
  };
  return require(authPath).default;
}

async function withServer(callback) {
  const app = express();
  app.use(express.json());
  app.use('/auth', loadAuthRouter());
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function post(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return {status: response.status, data};
}

test.beforeEach(() => {
  users.length = 0;
});

test('unverified duplicate signup resends a 6 digit verification code', async () => {
  await withServer(async baseUrl => {
    const first = await post(baseUrl, '/auth/signup', {
      email: 'beta@example.com',
      password: 'password123',
    });
    assert.equal(first.status, 201);
    assert.match(users[0].verification_code, /^\d{6}$/);
    const firstCode = users[0].verification_code;

    const duplicate = await post(baseUrl, '/auth/signup', {
      email: 'beta@example.com',
      password: 'newpassword123',
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.data.success, true);
    assert.match(users[0].verification_code, /^\d{6}$/);
    assert.notEqual(users[0].verification_code, firstCode);
  });
});

test('login before verification returns a clear 403', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'login@example.com',
      password: 'password123',
    });

    const login = await post(baseUrl, '/auth/login', {
      email: 'login@example.com',
      password: 'password123',
    });
    assert.equal(login.status, 403);
    assert.equal(login.data.data.verified, false);
    assert.match(login.data.message, /not verified/i);
  });
});

test('wrong or expired verification code is rejected without verifying the user', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'verify@example.com',
      password: 'password123',
    });
    const user = users[0];

    const wrong = await post(baseUrl, '/auth/verify-email', {
      email: user.email,
      code: '000000',
    });
    assert.equal(wrong.status, 400);
    assert.equal(user.verified, false);

    user.verification_code_expires_at = new Date(Date.now() - 1000);
    const expired = await post(baseUrl, '/auth/verify-email', {
      email: user.email,
      code: user.verification_code,
    });
    assert.equal(expired.status, 400);
    assert.match(expired.data.message, /expired/i);
    assert.equal(user.verified, false);
  });
});

test('resend verification creates a usable new code', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'resend@example.com',
      password: 'password123',
    });
    const user = users[0];
    user.verification_code_expires_at = new Date(Date.now() - 1000);

    const resend = await post(baseUrl, '/auth/resend-verification', {
      email: user.email,
    });
    assert.equal(resend.status, 200);
    assert.match(user.verification_code, /^\d{6}$/);

    const verify = await post(baseUrl, '/auth/verify-email', {
      email: user.email,
      code: user.verification_code,
    });
    assert.equal(verify.status, 200);
    assert.equal(user.verified, true);
  });
});

test('password reset code expires and a fresh code can reset the password', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'reset@example.com',
      password: 'password123',
    });
    const user = users[0];

    const forgot = await post(baseUrl, '/auth/forgot-password', {email: user.email});
    assert.equal(forgot.status, 200);
    user.reset_code_expires_at = new Date(Date.now() - 1000);

    const expired = await post(baseUrl, '/auth/reset-password', {
      email: user.email,
      code: user.reset_code,
      password: 'password456',
    });
    assert.equal(expired.status, 400);
    assert.match(expired.data.message, /expired/i);

    await post(baseUrl, '/auth/forgot-password', {email: user.email});
    const reset = await post(baseUrl, '/auth/reset-password', {
      email: user.email,
      code: user.reset_code,
      password: 'password456',
    });
    assert.equal(reset.status, 200);
    assert.equal(user.reset_code, null);
  });
});
