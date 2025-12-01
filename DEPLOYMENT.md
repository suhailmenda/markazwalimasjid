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

## Step 3: Configure Environment Variables

**CRITICAL:** Add your Supabase credentials in Vercel:

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
4. Select environments: **Production**, **Preview**, **Development**
5. Click **Save**
6. **Redeploy** your project (Deployments → ... → Redeploy)

## Step 4: Update Supabase Redirect URLs

1. Go to Supabase Dashboard → **Project Settings** → **Authentication**
2. Under **URL Configuration**:
   - **Site URL:** `https://your-project.vercel.app`
   - **Redirect URLs:** Add `https://your-project.vercel.app/**`
3. Save changes

## Step 5: Verify Deployment

1. Visit your deployed URL: `https://your-project.vercel.app`
2. Test the admin login at `/admin`
3. Check that prayer times load correctly

## Automatic Deployments

Vercel automatically deploys when you push to:
- **main branch** → Production deployment
- **other branches** → Preview deployment

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

### Environment Variables Not Working
- Make sure variables start with `VITE_` prefix
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase redirect URLs include your Vercel domain
- Ensure Supabase project is active

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Supabase redirect URLs with new domain

