# SaaS Authentication System

A full-stack authentication system with **OAuth** (Google, GitHub), **2FA (TOTP)**, and **role-based access control (RBAC)**.

## Features

- **Email/password** — registration and login
- **OAuth 2.0** — sign in with Google or GitHub
- **Two-factor authentication (2FA)** — TOTP via authenticator apps (e.g. Google Authenticator, Authy)
- **Role-based access control (RBAC)** — roles (`admin`, `user`, `moderator`) and permissions (`users:read`, `users:write`, `admin`, etc.)
- **Sessions** — JWT in HTTP-only cookies
- **Database** — SQLite with Prisma (easy to switch to PostgreSQL)

## Tech stack

| Layer    | Stack                    |
|----------|--------------------------|
| Backend  | Node.js, Express, TypeScript, Passport, Prisma |
| Frontend | React, Vite, TypeScript  |
| Auth     | JWT, Passport (local, Google OAuth 2.0, GitHub OAuth 2.0), TOTP (otplib) |

## Project structure

```
├── backend/              # Express + TypeScript API
│   ├── prisma/           # Schema, migrations, seed (roles & permissions)
│   └── src/
│       ├── auth/         # Passport strategies, JWT, 2FA (TOTP)
│       ├── middleware/   # requireAuth, requirePermission, requireRole
│       ├── routes/       # /api/auth, /api (dashboard, users, admin)
│       └── config.ts     # Env-based config (OAuth, JWT, URLs)
├── frontend/             # React + Vite + TypeScript
│   └── src/
│       ├── context/      # AuthContext
│       ├── pages/        # Login, Register, Dashboard, 2FA, AuthCallback
│       └── components/   # Layout, etc.
└── package.json          # Root scripts (dev, build, db)
```

## Quick start

### 1. Install dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Environment and database

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at least:

- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET` — a strong secret for signing JWTs
- `CLIENT_URL=http://localhost:5173`
- `SERVER_URL=http://localhost:4000`

Then:

```bash
npm run db:generate
npm run db:push
cd backend && npm run db:seed
cd ..
```

### 3. Run the app

```bash
npm run dev
```

- **Frontend:** http://localhost:5173 (Vite proxies `/api` to the backend)
- **Backend:** http://localhost:4000

Sign up or sign in, then use **2FA** in the nav to enable TOTP.

## OAuth (Google & GitHub)

To enable “Sign in with Google” and “Sign in with GitHub”, create OAuth apps and add credentials to `backend/.env`. If these are missing, the buttons still appear but the strategies are not registered.

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs:** add  
   `http://localhost:4000/api/auth/google/callback`  
   (use your real `SERVER_URL` in production).
5. Copy **Client ID** and **Client secret** into `.env`:

   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### GitHub

1. [GitHub Developer settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
2. **Authorization callback URL:**  
   `http://localhost:4000/api/auth/github/callback`  
   (use your real backend URL in production).
3. Copy **Client ID** and **Client secret** into `.env`:

   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

Restart the backend after changing env. OAuth failure redirects to the frontend login page.

## Environment (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `4000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Prisma DB URL (e.g. `file:./dev.db` for SQLite) |
| `JWT_SECRET` | Secret for signing JWTs (required) |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `SESSION_SECRET` | Used for session middleware |
| `CLIENT_URL` | Frontend origin (CORS and OAuth redirect) |
| `SERVER_URL` | Backend URL (OAuth callback base) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend + frontend (concurrently) |
| `npm run build` | Build backend + frontend |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB (no migrations) |
| `npm run db:studio` | Open Prisma Studio |
| `cd backend && npm run db:seed` | Seed roles and permissions |

## API overview

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (body: `email`, `password`, `name?`) |
| POST | `/api/auth/login` | Login (body: `email`, `password`) |
| GET | `/api/auth/google` | Start Google OAuth (redirect) |
| GET | `/api/auth/google/callback` | Google OAuth callback (redirect) |
| GET | `/api/auth/github` | Start GitHub OAuth (redirect) |
| GET | `/api/auth/github/callback` | GitHub OAuth callback (redirect) |
| GET | `/api/auth/me` | Current user (requires auth) |
| POST | `/api/auth/logout` | Clear session cookie |
| POST | `/api/auth/2fa/setup` | Get QR code for 2FA (requires auth) |
| POST | `/api/auth/2fa/verify` | Enable 2FA (body: `code`) (requires auth) |
| POST | `/api/auth/2fa/disable` | Disable 2FA (body: `code`) (requires auth) |
| POST | `/api/auth/2fa/login` | Complete login with 2FA (body: `token`, `code`) |

### Protected routes (require auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Example protected route |
| GET | `/api/users` | Requires `users:read` permission |
| GET | `/api/admin` | Requires `admin` role |

## RBAC

- **Roles** (seeded): `admin`, `user`, `moderator`
- **Permissions** (seeded): `users:read`, `users:write`, `users:delete`, `admin`
- In routes: `requirePermission("users:read")` or `requireRole("admin")`
- New users get the `user` role by default. Assign `admin` in the database (e.g. via Prisma Studio) to test admin routes.

## License

MIT
