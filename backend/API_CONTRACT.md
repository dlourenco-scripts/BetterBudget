# BetterBudget Backend API Contract

This document defines the backend API contract for BetterBudget. It covers the core domains needed to support pay-cycle budgeting, income, expenses, debt, forecasting, subscriptions, and admin workflows.

## Base URL

- Local development: `http://localhost:4000/api/v1`

---

## Auth

### POST /auth/signup
Create a new user and send verification.

Request body:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "currency": "USD"
}
```

Response body:
```json
{
  "success": true,
  "message": "Signup successful. Verification email sent.",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "verified": false,
      "currency": "USD"
    }
  }
}
```

### POST /auth/login
Authenticate user and return tokens.

Request body:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

Response body:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "verified": true,
      "currency": "USD"
    }
  }
}
```

### POST /auth/verify-email
Verify a user email by code or link.

Request body:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Response body:
```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

### POST /auth/forgot-password
Send a password reset email.

Request body:
```json
{
  "email": "user@example.com"
}
```

Response body:
```json
{
  "success": true,
  "message": "Password reset instructions were sent to your email."
}
```

### POST /auth/reset-password
Reset password using a code.

Request body:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "NewSecurePassword!"
}
```

Response body:
```json
{
  "success": true,
  "message": "Password was reset successfully."
}
```

---

## User Settings

### GET /users/me
Fetch current user details and preferences.

Response body:
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "currency": "USD",
    "theme": "light",
    "language": "en",
    "paydayReminderEnabled": true,
    "paydayReminderTime": "09:00",
    "subscription": "free",
    "onboardingComplete": false,
    "goalType": "save"
  }
}
```

### PATCH /users/me
Update settings and preferences.

Request body examples:
```json
{
  "currency": "USD",
  "theme": "dark",
  "language": "en",
  "paydayReminderEnabled": true,
  "paydayReminderTime": "09:00"
}
```

Response body:
```json
{
  "success": true,
  "message": "User settings updated.",
  "data": { ...updatedUser }
}
```

---

## Budgets

A budget encapsulates a pay-cycle-based budget, including incomes, recurring and one-time expenses, debts, reserve rules, and goal settings.

### GET /budgets
List budgets for the authenticated user.

Response body:
```json
{
  "success": true,
  "data": [ ...budgets ]
}
```

### POST /budgets
Create a new budget.

Request body:
```json
{
  "name": "Biweekly Budget",
  "netPay": 3200,
  "cycleType": "biweekly",
  "cycleStart": "2026-05-08",
  "cycleEnd": "2026-05-21",
  "reserveAmount": 100,
  "goalType": "save",
  "autoFillEnabled": true,
  "primaryIncomeId": "income_1"
}
```

Response body:
```json
{
  "success": true,
  "data": { ...budget }
}
```

### GET /budgets/:budgetId
Fetch a single budget with its detail components.

Response body:
```json
{
  "success": true,
  "data": {
    "id": "budget_123",
    "name": "Biweekly Budget",
    "netPay": 3200,
    "cycleType": "biweekly",
    "cycleStart": "2026-05-08",
    "cycleEnd": "2026-05-21",
    "reserveAmount": 100,
    "goalType": "save",
    "autoFillEnabled": true,
    "status": "active",
    "incomeSources": [ ... ],
    "expenses": [ ... ],
    "debts": [ ... ],
    "forecast": { ... }
  }
}
```

### PATCH /budgets/:budgetId
Update budget-level details.

Request body examples:
```json
{
  "name": "Updated Budget Name",
  "reserveAmount": 150,
  "autoFillEnabled": false,
  "goalType": "debt"
}
```

Response body:
```json
{
  "success": true,
  "message": "Budget updated.",
  "data": { ...updatedBudget }
}
```

### DELETE /budgets/:budgetId
Remove a budget (soft delete is recommended for history tracking).

Response body:
```json
{
  "success": true,
  "message": "Budget deleted."
}
```

---

## Income Sources

Income sources may be primary or secondary and support fixed or variable amounts.

### GET /budgets/:budgetId/incomes
List incomes for a budget.

### POST /budgets/:budgetId/incomes
Create a new income source.

Request body:
```json
{
  "name": "Primary Paycheck",
  "amount": 3200,
  "type": "primary",
  "frequency": "biweekly",
  "receivedDate": "2026-05-08",
  "category": "salary",
  "notes": "Regular pay"
}
```

### PATCH /budgets/:budgetId/incomes/:incomeId
Update income amount or metadata.

### DELETE /budgets/:budgetId/incomes/:incomeId
Delete a secondary income source. Primary incomes are locked by budget rules.

---

## Expenses

Expenses include recurring and one-time items.

### GET /budgets/:budgetId/expenses
List all expenses.

### POST /budgets/:budgetId/expenses
Create an expense.

Request body:
```json
{
  "name": "Electric Bill",
  "amount": 180,
  "type": "recurring",
  "dueDate": "2026-05-10",
  "category": "utilities",
  "priority": 1,
  "notes": "Monthly electric payment",
  "autoFillOverride": false
}
```

### PATCH /budgets/:budgetId/expenses/:expenseId
Edit an expense.

### DELETE /budgets/:budgetId/expenses/:expenseId
Remove an expense.

---

## Debts

Debt entries are active payoff targets, not long-term recurring obligations.

### GET /budgets/:budgetId/debts
List debts in a budget.

### POST /budgets/:budgetId/debts
Create a debt.

Request body:
```json
{
  "name": "Credit Card",
  "balance": 4500,
  "minimumPayment": 150,
  "interestRate": 18.9,
  "priority": 1,
  "status": "active"
}
```

### PATCH /budgets/:budgetId/debts/:debtId
Update debt balance, priority, or status.

Request body example:
```json
{
  "balance": 3200,
  "status": "paid_off"
}
```

### POST /budgets/:budgetId/debts/:debtId/payments
Record a debt payment and update remaining balance.

Request body:
```json
{
  "amount": 300,
  "date": "2026-05-12",
  "notes": "Extra payoff"
}
```

---

## Simulated Budget

### POST /budgets/:budgetId/simulate
Calculate the impact of a proposed expense or income change without saving it.

Request body examples:
```json
{
  "expenseChange": {
    "type": "one_time",
    "amount": 120,
    "category": "dining"
  }
}
```

Response body:
```json
{
  "success": true,
  "data": {
    "newRemaining": 450,
    "newSpendable": 320,
    "newForecast": { ... }
  }
}
```

---

## Forecasting / Insights

### GET /budgets/:budgetId/forecast
Return savings and debt payoff projections.

Response body:
```json
{
  "success": true,
  "data": {
    "goalType": "save",
    "savingsProjection": {
      "targetAmount": 5000,
      "projectedDate": "2026-12-01",
      "monthlyAllocation": 450
    },
    "debtProjection": [
      {
        "debtId": "debt_1",
        "name": "Credit Card",
        "projectedPayoffDate": "2027-03-01"
      }
    ]
  }
}
```

---

## Subscription & Pro Features

### GET /subscriptions/status
Fetch the user's subscription state.

Response body:
```json
{
  "success": true,
  "data": {
    "plan": "free",
    "renewalDate": null,
    "billingCycle": null,
    "entitlements": ["standard_budget"]
  }
}
```

### POST /subscriptions/subscribe
Create or update a subscription.

Request body example:
```json
{
  "plan": "monthly",
  "paymentMethod": "stripe_payment_method_id"
}
```

---

## Admin

### GET /admin/users
List users for support and analytics.

### GET /admin/users/:userId
Fetch a user's profile and activity.

### PATCH /admin/users/:userId
Update user status or access.

### GET /admin/metrics
Fetch dashboard metrics and usage data.

---

## Data Models

### User
- id
- email
- passwordHash
- verified
- currency
- theme
- language
- onboardingComplete
- paydayReminderEnabled
- paydayReminderTime
- subscriptionPlan
- createdAt
- updatedAt

### Budget
- id
- userId
- name
- netPay
- cycleType
- cycleStart
- cycleEnd
- reserveAmount
- goalType
- autoFillEnabled
- status
- createdAt
- updatedAt

### IncomeSource
- id
- budgetId
- name
- amount
- type
- frequency
- receivedDate
- category
- notes
- createdAt
- updatedAt

### Expense
- id
- budgetId
- name
- amount
- type
- dueDate
- category
- priority
- notes
- createdAt
- updatedAt

### Debt
- id
- budgetId
- name
- balance
- minimumPayment
- interestRate
- priority
- status
- createdAt
- updatedAt

---

## Notes
- The API is intentionally separate from the frontend.
- The frontend should call the backend via `src/network/NetworkManager.ts` after `BASE_URL` is updated.
- Primary income editing should use delta-only behavior and preserve the original budget structure.
- Auto-Fill should always prioritize required expenses, then reserve, then savings/debt.
- Forecasting should use historical budget cycles when available.
