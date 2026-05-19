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
    profile_image: '',
    auth_provider: 'password',
    google_id: null,
    apple_id: null,
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
    verification_code_sent_at: null,
    reset_code: null,
    reset_code_expires_at: null,
    reset_code_sent_at: null,
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

    if (compactSql.startsWith('SELECT id, verified, verification_code_sent_at FROM users WHERE email = $1')) {
      const user = users.find(item => item.email === params[0]);
      return {
        rows: user ? [{
          id: user.id,
          verified: user.verified,
          verification_code_sent_at: user.verification_code_sent_at,
        }] : [],
      };
    }

    if (compactSql.startsWith('SELECT * FROM users WHERE email = $1')) {
      const user = users.find(item => item.email === params[0]);
      return {rows: user ? [user] : []};
    }

    if (compactSql.startsWith('SELECT * FROM users WHERE google_id = $1')) {
      const user = users.find(item => item.google_id === params[0]);
      return {rows: user ? [user] : []};
    }

    if (compactSql.startsWith('SELECT * FROM users WHERE apple_id = $1')) {
      const user = users.find(item => item.apple_id === params[0]);
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

    if (compactSql.startsWith('SELECT id, reset_code_sent_at FROM users WHERE email = $1')) {
      const user = users.find(item => item.email === params[0]);
      return {rows: user ? [{id: user.id, reset_code_sent_at: user.reset_code_sent_at}] : []};
    }

    if (compactSql.startsWith('INSERT INTO users')) {
      if (compactSql.includes('auth_provider')) {
        const providerColumn = compactSql.includes('google_id') ? 'google_id' : 'apple_id';
        users.push(
          makeUser({
            id: params[0],
            email: params[1],
            password_hash: params[2],
            full_name: params[3],
            profile_image: params[4],
            auth_provider: params[5],
            [providerColumn]: params[6],
            verified: true,
            currency: params[7],
          }),
        );
        return {rows: []};
      }

      users.push(
        makeUser({
          id: params[0],
          email: params[1],
          password_hash: params[2],
          verified: params[3],
          currency: params[4],
          verification_code: params[5],
          verification_code_expires_at: params[6],
          verification_code_sent_at: params[7],
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
        reset_code_sent_at: null,
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET google_id = $1') || compactSql.startsWith('UPDATE users SET apple_id = $1')) {
      const user = users.find(item => item.id === params[4]);
      const providerColumn = compactSql.startsWith('UPDATE users SET google_id = $1') ? 'google_id' : 'apple_id';
      Object.assign(user, {
        [providerColumn]: params[0],
        auth_provider: user.auth_provider === 'password' ? user.auth_provider : params[1],
        verified: true,
        full_name: user.full_name || params[2],
        profile_image: user.profile_image || params[3],
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET password_hash = $1')) {
      if (params.length === 3) {
        const user = users.find(item => item.id === params[2]);
        Object.assign(user, {
          password_hash: params[0],
          currency: params[1],
          verified: true,
          verification_code: null,
          verification_code_expires_at: null,
          verification_code_sent_at: null,
        });
        return {rows: []};
      }

      const user = users.find(item => item.id === params[5]);
      Object.assign(user, {
        password_hash: params[0],
        currency: params[1],
        verification_code: params[2],
        verification_code_expires_at: params[3],
        verification_code_sent_at: params[4],
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET verified = true')) {
      const user = users.find(item => item.id === params[0]);
      Object.assign(user, {
        verified: true,
        verification_code: null,
        verification_code_expires_at: null,
        verification_code_sent_at: null,
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET verification_code = $1')) {
      const user = users.find(item => item.id === params[3]);
      Object.assign(user, {
        verification_code: params[0],
        verification_code_expires_at: params[1],
        verification_code_sent_at: params[2],
      });
      return {rows: []};
    }

    if (compactSql.startsWith('UPDATE users SET reset_code = $1')) {
      const user = users.find(item => item.id === params[3]);
      Object.assign(user, {
        reset_code: params[0],
        reset_code_expires_at: params[1],
        reset_code_sent_at: params[2],
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
  const text = await response.text();
  const data = text && text.trim().startsWith('{') ? JSON.parse(text) : {raw: text};
  return {status: response.status, data};
}

test.beforeEach(() => {
  users.length = 0;
  delete process.env.GOOGLE_CLIENT_IDS;
  global.fetch = fetch;
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
    users[0].verification_code_sent_at = new Date(Date.now() - 61_000);

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
    user.verification_code_sent_at = new Date(Date.now() - 61_000);

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

    user.reset_code_sent_at = new Date(Date.now() - 61_000);
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

test('resend verification enforces a cooldown', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'cooldown@example.com',
      password: 'password123',
    });

    const resend = await post(baseUrl, '/auth/resend-verification', {
      email: 'cooldown@example.com',
    });
    assert.equal(resend.status, 429);
    assert.equal(resend.data.code, 'resend_cooldown');
    assert.equal(typeof resend.data.data.retryAfterSeconds, 'number');
  });
});

test('duplicate unverified signup also respects verification cooldown', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'signup-cooldown@example.com',
      password: 'password123',
    });

    const duplicate = await post(baseUrl, '/auth/signup', {
      email: 'signup-cooldown@example.com',
      password: 'password123',
    });
    assert.equal(duplicate.status, 429);
    assert.equal(duplicate.data.code, 'resend_cooldown');
  });
});

test('reset code can be verified before setting a new password', async () => {
  await withServer(async baseUrl => {
    await post(baseUrl, '/auth/signup', {
      email: 'verify-reset@example.com',
      password: 'password123',
    });
    const user = users[0];
    user.reset_code_sent_at = new Date(Date.now() - 61_000);
    await post(baseUrl, '/auth/forgot-password', {email: user.email});

    const invalid = await post(baseUrl, '/auth/verify-reset-code', {
      email: user.email,
      code: '000000',
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.code, 'invalid_code');

    const valid = await post(baseUrl, '/auth/verify-reset-code', {
      email: user.email,
      code: user.reset_code,
    });
    assert.equal(valid.status, 200);
  });
});

test('google social login creates a verified session and can log in again', async () => {
  const originalFetch = global.fetch;
  process.env.GOOGLE_CLIENT_IDS = 'google-client-id';
  global.fetch = async (url, options) => {
    const requestUrl = typeof url === 'string' ? url : url?.url || String(url);
    if (!requestUrl.includes('oauth2.googleapis.com/tokeninfo')) {
      return originalFetch(url, options);
    }

    return {
      ok: true,
      async json() {
        return {
          aud: 'google-client-id',
          sub: 'google-user-1',
          email: 'google@example.com',
          email_verified: 'true',
          name: 'Google User',
          picture: 'https://example.com/avatar.png',
        };
      },
    };
  };

  try {
    await withServer(async baseUrl => {
      const first = await post(baseUrl, '/auth/social-login', {
        provider: 'google',
        idToken: 'google-id-token',
      });
      assert.equal(first.status, 200);
      assert.equal(first.data.success, true);
      assert.equal(first.data.data.isNewUser, true);
      assert.equal(first.data.data.user.email, 'google@example.com');
      assert.equal(first.data.data.user.verified, true);
      assert.ok(first.data.data.token);

      const second = await post(baseUrl, '/auth/social-login', {
        provider: 'google',
        idToken: 'google-id-token',
      });
      assert.equal(second.status, 200);
      assert.equal(second.data.data.isNewUser, false);
      assert.equal(second.data.data.user.id, first.data.data.user.id);
    });
  } finally {
    global.fetch = originalFetch;
  }
});
