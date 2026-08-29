# Production Readiness Checklist

This project now has the core backend structure, migration scaffold, and a
small smoke-test harness. It is still not production-ready until the items
below are complete.

## Still required before production

1. Set `APP_ENV=production`.
1. Provision PostgreSQL for production.
1. Set `DATABASE_URL` to the production PostgreSQL connection string.
1. Set `AUTO_CREATE_TABLES=false` in production.
1. Set strong secrets:
   - `JWT_SECRET`
   - `SESSION_SECRET_KEY`
1. Set `COOKIE_SECURE=true` behind HTTPS.
1. Set `CORS_ORIGINS` to the real frontend origin(s).
1. Configure real email delivery:
   - `MAIL_CONSOLE_MODE=false`
   - `RESEND_API_KEY`
   - `MAIL_FROM`
   - `MAIL_FROM_NAME`
   - keep the SMTP settings only if you still need them as a fallback
1. Configure Google OAuth/OIDC:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
1. Run database migrations against PostgreSQL:
   - `python -m alembic upgrade head`
1. Run backend tests:
   - `pytest`
1. Run the frontend build:
   - `npm run build`
1. Deploy over HTTPS with secure headers and logging.
1. Keep secrets out of tracked repo files. `backend/alembic.ini` should remain secret-free and the tracked `backend/.env.example` should be used as the template for deployment values.

## Local verification commands

Backend:

```powershell
cd backend
venv\Scripts\python.exe -m pytest
venv\Scripts\python.exe -m alembic current
venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm run build
npm run dev
```

## Recommended deployment order

1. Pass the backend smoke tests locally.
1. Verify the production PostgreSQL connection.
1. Run Alembic migrations.
1. Confirm the frontend build passes.
1. Validate auth, refresh-cookie, and CORS behavior end to end.
1. Deploy backend and frontend behind HTTPS.
