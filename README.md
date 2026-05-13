# BetterBudget

BetterBudget is an Expo React Native app with a Node/Express/TypeScript backend and PostgreSQL database.

## Requirements

- Node 20 LTS
- Local PostgreSQL for development
- AWS RDS PostgreSQL for hosted beta/TestFlight backend

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

The backend runs on port `4000` and initializes the PostgreSQL schema on startup. In local development, signup and password reset codes are logged to the backend console.

## Backend Production Commands

```bash
cd backend
npm install
npm run build
npm start
```

`npm start` runs the compiled server from `dist/index.js`. The server listens on `process.env.PORT`, falling back to `4000`.

## Backend Environment Variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production` in AWS. |
| `PORT` | Yes | App Runner can provide this. Default local value is `4000`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use the AWS RDS endpoint in production. |
| `JWT_SECRET` | Yes | Must be a strong secret in production. |
| `TOKEN_EXPIRES_IN` | Yes | Example: `7d`. |
| `CORS_ORIGINS` | For browser clients | Comma-separated allowed browser origins. Native mobile calls usually do not send an origin. |
| `AWS_REGION` or `SES_REGION` | Production email | SES region, for example `us-east-1`. |
| `AWS_ACCESS_KEY_ID` | Production email | IAM access key with SES send permissions. Store in App Runner env/secrets, not in git. |
| `AWS_SECRET_ACCESS_KEY` | Production email | IAM secret key. Store in App Runner env/secrets, not in git. |
| `SES_FROM_EMAIL` | Production email | Verified SES sender, for example `no-reply@betterbudget.app`. |

## AWS RDS PostgreSQL Notes

Create an RDS PostgreSQL instance and a `betterbudget` database. Use a connection string like:

```bash
DATABASE_URL=postgresql://<user>:<password>@<rds-endpoint>:5432/betterbudget
```

When `NODE_ENV=production`, the backend enables PostgreSQL SSL with `rejectUnauthorized: false`, which works with standard RDS connection strings. The schema is initialized by the backend on startup, so the first App Runner boot can create the tables. For stricter release control later, move that startup initialization into a dedicated migration command.

Make sure the RDS security group allows inbound PostgreSQL traffic from the App Runner service/VPC connector path you choose. Do not expose RDS broadly to the public internet for beta.

## AWS App Runner Deployment

The repo includes `apprunner.yaml` for deploying the backend from the repository root.

App Runner uses:

- Runtime: Node.js 20
- Install: `npm --prefix backend ci`
- Build: `npm --prefix backend run build`
- Start: `npm --prefix backend start`
- Port: `4000` through the `PORT` environment variable

Set all secrets and environment-specific values in App Runner, not in the repo. Recommended production values:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://<user>:<password>@<rds-endpoint>:5432/betterbudget
JWT_SECRET=<strong-secret>
TOKEN_EXPIRES_IN=7d
CORS_ORIGINS=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<ses-access-key>
AWS_SECRET_ACCESS_KEY=<ses-secret-key>
SES_FROM_EMAIL=no-reply@betterbudget.app
```

Use `/health` as the health check path if App Runner asks for one.

## SES Email Verification

Local development does not require SMTP or SES. The backend logs codes like:

```text
DEV VERIFICATION CODE for user@email.com: 123456
```

In production, the backend sends verification and password reset codes through Amazon SES. Before beta:

- Verify `SES_FROM_EMAIL` or the full sending domain in SES.
- If SES is still in sandbox mode, verify test recipient emails or request production SES access.
- Create an IAM user/key with permission to send email through SES, or replace the key-based sender later with an App Runner role-based sender.

## Frontend Local Setup

```bash
cd frontend
npm install
npx expo start --lan
```

The frontend reads `EXPO_PUBLIC_API_URL` first. For local development, `frontend/.env` and `frontend/.env.development` should point to your local backend:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.125:4000/api/v1
```

`frontend/.env`, `frontend/.env.development`, and `frontend/.env.production` are ignored by git. Use the committed example files as templates:

```bash
copy .env.development.example .env.development
copy .env.production.example .env.production
```

Switch Expo to the local API without editing source:

```bash
npm run env:development
npx expo start --lan
```

For Expo Go on a phone, the app now tries to detect the Expo LAN host and calls the backend at:

```text
http://<expo-lan-host>:4000/api/v1
```

You can still override it manually:

```bash
$env:EXPO_PUBLIC_API_URL="http://YOUR_LAN_IP:4000/api/v1"
npx expo start --lan --clear
```

Without `EXPO_PUBLIC_API_URL`, a LAN host, or the older `EXPO_PUBLIC_API_BASE_URL` fallback, the frontend defaults to `localhost` for iOS/web and `10.0.2.2` for the Android emulator.

## Frontend TestFlight API URL

For TestFlight and production builds, set `EXPO_PUBLIC_API_URL` before building:

```bash
EXPO_PUBLIC_API_URL=https://api.betterbudget.app/api/v1
```

You can prepare the local production env file without editing source:

```bash
npm run env:production
```

For EAS/TestFlight, prefer setting `EXPO_PUBLIC_API_URL` in the EAS production environment instead of relying on a local file. This value must be present when the production Expo/EAS build is created, because Expo public environment variables are bundled into the app.

Local and production must use separate databases:

- Local backend: `backend/.env` with local PostgreSQL.
- Production backend: AWS App Runner environment variables with AWS RDS PostgreSQL.
- Frontend local: `EXPO_PUBLIC_API_URL=http://<local-lan-ip>:4000/api/v1`.
- Frontend production/TestFlight: `EXPO_PUBLIC_API_URL=https://api.betterbudget.app/api/v1`.

## What Is Needed From AWS To Connect

To point the app at AWS, collect these values:

- RDS endpoint, database name, username, and password, or the full `DATABASE_URL`.
- App Runner service URL, and later the custom API domain such as `https://api.betterbudget.app`.
- SES region and verified sender email/domain.
- SES IAM access key and secret key with send permissions.
- Any browser/admin origins that should be allowed in `CORS_ORIGINS`.

After those are set in App Runner, update the frontend production build environment to use the hosted API URL.

## API

See `backend/API_CONTRACT.md` for backend endpoints and response shapes.
