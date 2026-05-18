# BetterBudget Backend

This folder contains the Node/Express/TypeScript backend for the BetterBudget app.

## Getting Started

Required versions:

- Node 20 LTS
- Local PostgreSQL

Install dependencies:

```bash
cd backend
npm install
```

Create the local database:

```bash
createdb betterbudget
```

Create a `.env` file from `.env.example`:

```bash
copy .env.example .env
```

Set `DATABASE_URL` in `.env`:

```bash
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/betterbudget
```

Run the backend locally:

```bash
npm run dev
```

The API will start on port `4000` by default.

In local development, signup logs the email verification code to the backend console:

```text
DEV VERIFICATION CODE for user@email.com: 123456
```

Set `SKIP_EMAIL_VERIFICATION=true` only for local/dev testing when you want signup to create a verified session immediately. Keep it `false` in production.

Verification and password reset codes expire after 15 minutes. Resend endpoints are rate limited with `AUTH_CODE_RESEND_COOLDOWN_SECONDS`, defaulting to 60 seconds.

## Production Email

Production email is sent through Amazon SES when `NODE_ENV=production`.

Required Render environment variables:

```bash
NODE_ENV=production
SKIP_EMAIL_VERIFICATION=false
AUTH_CODE_RESEND_COOLDOWN_SECONDS=60
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<ses-sending-access-key>
AWS_SECRET_ACCESS_KEY=<ses-sending-secret>
SES_FROM_EMAIL=no-reply@your-verified-domain.com
```

The SES identity for `SES_FROM_EMAIL` must be verified in the same AWS Region used by `AWS_REGION`. If the account is still in the SES sandbox, AWS only allows sending to verified recipient addresses.

## Routes

- `GET /` - health check
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/verify-reset-code`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `GET /api/v1/budgets/:budgetId`
- `PATCH /api/v1/budgets/:budgetId`
- `DELETE /api/v1/budgets/:budgetId`

## API Contract

See `API_CONTRACT.md` for the full backend API contract, budget models, and endpoint definitions.
