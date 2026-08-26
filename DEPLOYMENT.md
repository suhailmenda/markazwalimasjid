# Deployment Guide - Vercel

## Prerequisites
1. GitHub account (or GitLab/Bitbucket)
2. Vercel account (sign up at [vercel.com](https://vercel.com))
3. Your code pushed to a Git repository

## Step 1: Push Code to GitHub

If you haven't already:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository (GitHub/GitLab/Bitbucket)
4. Vercel will auto-detect Vite settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **"Deploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# For production deployment
vercel --prod
```

## Step 3: Verify Deployment

1. Visit your deployed URL: `https://your-project.vercel.app`
2. Test the admin login at `/admin`
3. Check that prayer times load correctly
4. Open `/admin` to update settings stored in that browser

## Automatic Deployments

Vercel automatically deploys when you push to:
- **main branch** → Production deployment
- **other branches** → Preview deployment

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

