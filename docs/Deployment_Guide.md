# Deployment Guide: Personifier

This document outlines the step-by-step instructions to deploy the **Personifier Backend (NestJS)** to Render and the **Personifier Frontend (Next.js)** to Vercel.

---

## 1. Backend Deployment (Render)

Render uses the `render.yaml` configuration at the root of the project to automatically configure your service.

### Step-by-Step Setup:
1. Push your repository to GitHub/GitLab.
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your repository. Render will automatically detect the `render.yaml` file.
5. In the blueprint setup, configure the following environment variables:
   - `FRONTEND_URL`: Point this to your Vercel frontend domain (e.g. `https://personifier-web.vercel.app`).
   - `JWT_SECRET`: A secure random string for encrypting access tokens.
   - `JWT_REFRESH_SECRET`: A secure random string for encrypting refresh tokens.
   - `DATABASE_URL`: Your production Postgres database connection string (e.g. from Render PostgreSQL or Supabase). If left blank, it will fall back to SQLite (though Render's filesystem is ephemeral, so a real database is recommended).
   - `REDIS_URL`: Your serverless Redis connection string (e.g. from Upstash).
6. Click **Approve** to deploy.

---

## 2. Frontend Deployment (Vercel)

Vercel natively supports Next.js monorepo configurations.

### Step-by-Step Setup:
1. Log in to the [Vercel Dashboard](https://vercel.com).
2. Click **Add New** > **Project** and import your repository.
3. In the **Configure Project** screen, set the following:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select **`apps/web`**.
4. Expand the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_URL`: Your hosted Render backend URL (e.g. `https://personifier-api.onrender.com`).
5. Click **Deploy**. Vercel will automatically resolve workspace dependencies from the root monorepo structure and build the application successfully.
