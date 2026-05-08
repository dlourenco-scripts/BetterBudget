# BetterBudget Backend

This folder contains a dedicated backend scaffold for the BetterBudget app.

## Getting Started

Install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file from `.env.example` if you want to override settings.

Run the backend locally:

```bash
npm run dev
```

The API will start on port `4000` by default.

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
