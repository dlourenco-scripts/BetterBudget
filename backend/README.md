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

## Routes

- `GET /` - health check
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `GET /api/v1/budgets/:budgetId`
- `PATCH /api/v1/budgets/:budgetId`
- `DELETE /api/v1/budgets/:budgetId`

## API Contract

See `API_CONTRACT.md` for the full backend API contract, budget models, and endpoint definitions.
