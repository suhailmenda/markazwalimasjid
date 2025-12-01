# Supabase Setup Guide

Follow these steps to configure Supabase Authentication for your Mosque Website.

## Step 1: Create a Supabase Project
1.  Go to [Supabase](https://supabase.com/).
2.  Click **"Start your project"**.
3.  Sign in with GitHub.
4.  Click **"New project"**.
5.  Enter a name (e.g., `mosque-website`), password, and region.
6.  Click **"Create new project"**.
7.  Wait a few minutes for the database to be provisioned.

## Step 2: Get API Keys
1.  Once the project is ready, go to **Project Settings** (gear icon at the bottom left).
2.  Click **API** in the sidebar.
3.  Under "Project URL", copy the **URL**.
4.  Under "Project API keys", copy the **`anon`** public key.

## Step 3: Configure Environment Variables
1.  Open the `.env` file in your project root (VS Code).
2.  Replace the placeholder values with the keys from Step 2.

Example:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Create an Admin User
1.  In the Supabase dashboard, go to **Authentication** (users icon in the left sidebar).
2.  Click **Add user** (top right).
3.  Select **Send invitation** (or "Create user" if available directly, usually "Send invitation" sends a magic link, but you can also just create a user with a password if you disable email confirmation or confirm it manually).
    *   *Easier method for testing*:
    1.  Click **Add user**.
    2.  Enter the email (e.g., `admin@nurulhuda.com`).
    3.  Enter a password.
    4.  Click **Create user**.
    5.  **Important**: By default, Supabase might require email confirmation. To bypass this for testing:
        *   Go to **Authentication** -> **Providers** -> **Email**.
        *   Disable **Confirm email**.
        *   OR, after creating the user, click on the user row -> **...** -> **Confirm user** (if available) or just check your email if you used a real one.

## Step 5: Restart Server
1.  If your development server is running, stop it (Ctrl+C).
2.  Run `npm run dev` again to load the new environment variables.
3.  Go to `http://localhost:5173/admin` and log in!
