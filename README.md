# BetterBudget

BetterBudget is an Expo React Native app with a Node/Express/TypeScript backend.

## Requirements

- Node 20 LTS
- Local PostgreSQL

## Backend Local Setup

```bash
cd backend
npm install
createdb betterbudget
copy .env.example .env
```

Set `DATABASE_URL` in `backend/.env`:

```bash
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/betterbudget
```

Start the backend:

```bash
npm run dev
```

The backend runs on port `4000` and initializes the PostgreSQL schema on startup. In local development, signup logs the email verification code to the backend console.

## Frontend Local Setup

```bash
cd frontend
npm install
npx expo start --lan
```

For Expo Go on a phone, set the API base URL to your computer's LAN IP before starting Expo:

```bash
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_LAN_IP:4000/api/v1"
npx expo start --lan
```

Without `EXPO_PUBLIC_API_BASE_URL`, the frontend defaults to `localhost` for iOS/web and `10.0.2.2` for the Android emulator.

## API

See `backend/API_CONTRACT.md` for backend endpoints and response shapes.
