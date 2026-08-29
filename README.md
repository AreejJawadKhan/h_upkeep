# Hupkeep

Hupkeep is a calm home-maintenance workspace for keeping homes, repairs, schedules, spending, warranties, and documents organized in one place.

It is designed as both a real product and a strong portfolio piece:
- a polished React/Vite frontend
- a FastAPI backend with PostgreSQL and Alembic migrations
- secure auth with JWT access tokens, refresh cookies, and Google sign-in
- document storage with Cloudinary
- email delivery through Resend
- a consistent lime, ink, and canvas visual system

## Live links

- Frontend: [https://hupkeep.areejjkhan.tech](https://hupkeep.areejjkhan.tech)
- API: [https://api.hupkeep.areejjkhan.tech](https://api.hupkeep.areejjkhan.tech)
- Terms of Service: [https://hupkeep.areejjkhan.tech/terms](https://hupkeep.areejjkhan.tech/terms)
- Privacy Policy: [https://hupkeep.areejjkhan.tech/privacy](https://hupkeep.areejjkhan.tech/privacy)


## Project description

Hupkeep helps homeowners and property managers track the full upkeep cycle of a home:
- create homes, areas, and assets
- log maintenance records and recurring schedules
- track spending by home, category, and asset
- attach documents, receipts, manuals, and warranty files
- manage warranty coverage and upcoming attention items

The product is intentionally calm, readable, and practical. The goal is to make home upkeep feel organized instead of noisy.

## Feature list

- secure sign up, login, logout, and Google sign-in
- email verification and password reset flows
- refresh-cookie-based session handling
- home, area, and asset management
- maintenance records and recurring maintenance schedules
- spending analytics and cost breakdowns
- document upload and document history
- warranty tracking and expiry awareness
- responsive mobile navigation and drawers
- accessible modals, focus handling, and error states
- production-friendly backend validation and CORS restrictions

## Architecture summary

### Frontend
- React 19
- Vite
- TypeScript
- React Router
- route-level code splitting
- shared design system components for buttons, panels, drawers, dialogs, and form fields
- accessibility-focused keyboard/focus handling

### Backend
- FastAPI
- SQLAlchemy
- Alembic migrations
- PostgreSQL in production
- SQLite for local development
- JWT access tokens plus secure refresh cookies
- Google OAuth / OIDC
- Resend email delivery
- Cloudinary file storage

### Data model
- Users
- Homes
- Areas
- Assets
- Maintenance records
- Maintenance schedules
- Maintenance documents
- Warranties
- Verification/reset tokens
- Refresh tokens

## Local setup

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Then run the API:

```powershell
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Running tests

### Backend tests

```powershell
cd backend
.venv\Scripts\python.exe -m pytest
```

Optional coverage run:

```powershell
cd backend
.venv\Scripts\python.exe scripts\test_coverage.py
```

### Frontend tests

```powershell
cd frontend
npm test -- --run --pool=threads --maxWorkers=1
```

### Frontend end-to-end tests

```powershell
cd frontend
npm run test:e2e -- happy-path.spec.ts layout-states.spec.ts responsive-shell.spec.ts major-flows.spec.ts
```

### Frontend production build

```powershell
cd frontend
npm run build
```

## Production notes

- Keep secrets out of tracked files.
- Use `backend/.env.example` and `frontend/.env.local` or `frontend/.env.production` as the source of truth for environment shape.
- In production, `APP_ENV` should be `production`.
- Use a real PostgreSQL database URL.
- Set strong `JWT_SECRET` and `SESSION_SECRET_KEY`.
- Set `COOKIE_SECURE=true`.
- Point `CORS_ORIGINS` only at your real frontend origin.
- Set `MAIL_CONSOLE_MODE=false` and provide `RESEND_API_KEY`.
- Configure Google OAuth values for your deployed domain.

## Repository structure

```text
backend/   FastAPI app, Alembic migrations, tests, production config
frontend/  React app, pages, components, styles, tests, e2e checks
docs/      Supporting documentation and screenshot placeholders
```

## Legal pages

The app includes:
- Terms of Service: `/terms`
- Privacy Policy: `/privacy`

They are linked from the landing page, auth pages, and the public legal routes.

