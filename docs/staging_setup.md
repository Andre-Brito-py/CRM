# Staging Environment Setup Guide

To get your `develop` branch running as a separate staging environment on Vercel, follow these steps:

### 1. Neon Postgres (Database)
- Open your **Neon Console**.
- Create a new **Branch** called `staging` from your `main` branch.
- Copy the **Connection String** for this new branch. This will be your `DATABASE_URL` for staging.

### 2. Vercel Environment Variables
- Go to your Vercel Project **Settings** > **Environment Variables**.
- For each critical variable (like `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.):
    - Edit the variable.
    - Check the **Preview** environment box (this covers your `develop` branch).
    - Paste the value you want for staging (e.g., the Neon staging connection string).
    - Click **Save**.

### 3. Verification
- Push any change to your `develop` branch:
  ```bash
  git checkout develop
  git merge main
  git push origin develop
  ```
- Vercel will automatically detect the push and create a **Preview Deployment**.
- You will get a unique URL for this deployment (e.g., `nextacular-git-develop-yourteam.vercel.app`).

### 4. Promotion to Production
- When you are happy with your changes on the staging URL, merge `develop` into `main`:
  ```bash
  git checkout main
  git merge develop
  git push origin main
  ```
- This will update your production site at `vysify.com`.
