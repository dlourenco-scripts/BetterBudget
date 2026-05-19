# Better Budget Environments

## Branches

- `main`: production-ready only. Deploys to the production Render service.
- `develop`: active feature work and testing. Deploys to the staging Render service.

## Backend Render Services

Production service:

- Branch: `main`
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Database: production RDS database

Staging service:

- Branch: `develop`
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Database: staging RDS database, for example `betterbudget_staging`

## Backend Environment Variables

Production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/PRODUCTION_DB
DATABASE_SSL=true
JWT_SECRET=production-secret
TOKEN_EXPIRES_IN=7d
SKIP_EMAIL_VERIFICATION=false
```

Staging:

```env
NODE_ENV=staging
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/betterbudget_staging
DATABASE_SSL=true
JWT_SECRET=staging-secret
TOKEN_EXPIRES_IN=7d
SKIP_EMAIL_VERIFICATION=true
```

## Frontend API Environments

Create local ignored files from the examples:

- `frontend/.env.local`
- `frontend/.env.staging`
- `frontend/.env.production`

Commands:

```powershell
npm run start:local
npm run start:staging
npm run start:production-api
```

The start scripts set Expo environment variables explicitly and disable Expo dotenv loading to avoid `.env.development` overriding the selected API URL.

## EAS Profiles

- `preview` / `staging`: internal testing against the staging API.
- `production`: production/TestFlight build against the production API.

## Release Flow

1. Build and test feature work on `develop`.
2. Let Render staging auto-deploy from `develop`.
3. Test the staging app/API.
4. Merge `develop` into `main` only when ready for production.
5. Let Render production auto-deploy from `main`.
6. Build production TestFlight from the `production` EAS profile.
