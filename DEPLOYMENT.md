# Hackcrux Internet Deployment Guide

This guide deploys:
- Backend (Spring Boot) on Render
- Frontend (Vite + React) on Vercel
- Database on MongoDB Atlas

## 1) Prepare MongoDB Atlas

1. Create a free cluster in MongoDB Atlas.
2. Create a database user and password.
3. In Network Access, allow your host platform IPs (or use 0.0.0.0/0 during setup).
4. Copy the connection string and replace placeholders.

Example:
`mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ertriagedb?retryWrites=true&w=majority`

## 2) Deploy Backend on Render

1. Push latest code to GitHub.
2. In Render, create a **Web Service** from this repo.
3. Configure:
   - Root Directory: `er-triage-backend`
   - Runtime: `Java`
   - Build Command: `mvn -DskipTests clean package`
   - Start Command: `java -jar target/*.jar`
4. Add environment variables:
   - `PORT` = `8081` (Render may override; app reads `PORT` automatically)
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = long random secret
   - `AI_PROVIDER` = `huggingface` or `gemini`
   - `HF_API_KEY` = your key (if using HF)
   - `GEMINI_API_KEY` = your key (if using Gemini)
   - `APP_CORS_ALLOWED_ORIGIN_PATTERNS` = `https://your-frontend-domain,https://*.vercel.app,http://localhost:*`
5. Deploy and copy your backend URL, for example:
   - `https://your-backend.onrender.com`

Health check:
- Open `https://your-backend.onrender.com/api/auth/me` (expects auth and should return 401/403, which confirms API is reachable).

## 3) Deploy Frontend on Vercel

1. In Vercel, import the same GitHub repo.
2. Configure project:
   - Root Directory: `er-triage-frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com/api`
4. Deploy.

## 4) Final CORS Update

After frontend is deployed, copy the exact frontend URL and update backend env var:
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS` = `https://your-frontend-url,https://*.vercel.app,http://localhost:*`

Redeploy backend after changing env vars.

## 5) Smoke Test

1. Open frontend URL.
2. Login with seeded admin user (for example `superadmin`).
3. Verify pages load data from backend:
   - triage board
   - recycle bin
   - staff/task tabs

## 6) Optional Production Hardening

- Rotate `JWT_SECRET` and API keys if they were exposed before.
- Restrict MongoDB Atlas network access from `0.0.0.0/0` to known ranges.
- Use separate prod/staging databases.
- Disable or remove any permissive fallback behaviors not needed in production.
