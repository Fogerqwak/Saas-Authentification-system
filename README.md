# SaaS Authentication System

A full-stack authentication system with **OAuth** (Google, GitHub), **2FA (TOTP)**, and **role-based access control (RBAC)**.

## Features

- **Email/password** registration and login
- **OAuth 2.0** with Google and GitHub
- **Two-factor authentication (2FA)** via TOTP (authenticator apps)
- **Role-based access control**: roles (admin, user, moderator) and permissions (`users:read`, `users:write`, `admin`, etc.)
- JWT-based sessions with HTTP-only cookies
- SQLite database (Prisma) — easy to switch to PostgreSQL

## Project structure

```
├── backend/          # Express + TypeScript API
│   ├── prisma/       # Schema + seed (roles & permissions)
│   └── src/
│       ├── auth/     # Passport strategies, JWT, 2FA
│       ├── middleware/ # requireAuth, requirePermission, requireRole
│       └── routes/   # /api/auth, /api (dashboard, users, admin)
├── frontend/         # React + Vite + TypeScript
└── package.json      # Root scripts (dev, build, db)
```

## Quick start

### 1. Install dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Database

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set at least:
#   DATABASE_URL="file:./dev.db"
#   JWT_SECRET=your-secret

npm run db:generate
npm run db:push
npm run db:seed
```

### 3. Run

```bash
npm run dev
```

- **Frontend**: http://localhost:5173  
- **Backend**: http://localhost:4000  

Sign up or sign in, then visit **2FA** in the nav to enable TOTP.

## Environment (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `4000`) |
| `DATABASE_URL` | Prisma DB URL (e.g. `file:./dev.db` for SQLite) |
| `JWT_SECRET` | Secret for signing JWTs |
| `CLIENT_URL` | Frontend origin (for CORS and OAuth redirect) |
| `SERVER_URL` | Backend URL (for OAuth callback URLs) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) |

### OAuth setup

- **Google**: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client (Web). Authorized redirect URI: `http://localhost:4000/api/auth/google/callback` (or your `SERVER_URL` + path).
- **GitHub**: GitHub → Settings → Developer settings → OAuth Apps → New. Callback URL: `http://localhost:4000/api/auth/github/callback`.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (email, password, name?) |
| POST | `/api/auth/login` | Login (email, password) |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/github` | Start GitHub OAuth |
| GET | `/api/auth/me` | Current user (requires auth) |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/auth/2fa/setup` | Get QR for 2FA (requires auth) |
| POST | `/api/auth/2fa/verify` | Enable 2FA with code |
| POST | `/api/auth/2fa/login` | Complete login with 2FA code (body: token, code) |
| GET | `/api/dashboard` | Example protected route |
| GET | `/api/users` | Requires `users:read` permission |
| GET | `/api/admin` | Requires `admin` role |

## RBAC

- **Roles** (seed): `admin`, `user`, `moderator`
- **Permissions** (seed): `users:read`, `users:write`, `users:delete`, `admin`
- Use `requirePermission("users:read")` or `requireRole("admin")` in routes.
- New users get the `user` role by default. Assign `admin` in the database to test admin routes.

## License

MIT
