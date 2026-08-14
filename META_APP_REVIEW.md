# Meta App Review — Checklist for Going Live

This guide covers the exact steps needed in the Facebook Developer Console to move the app from **Development mode** (testers/admins only) to **Live mode** (any business owner can connect).

The production callback URL and `APP_BASE_URL` env var are already configured — only the Facebook side remains.

---

## Step 1 — Add the Production Callback URL to Facebook App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → select this app
2. Navigate to **Facebook Login for Business** (or **Facebook Login**) → **Settings**
3. Under **Valid OAuth Redirect URIs**, add:
   ```
   https://lead-magnet-hub-shaamsarath1.replit.app/api/auth/facebook/callback
   ```
4. Click **Save Changes**

> The development redirect URI (`https://<dev-domain>/api/auth/facebook/callback`) can stay alongside it — both can coexist.

---

## Step 2 — Add the Production Domain to App Settings

1. In the Facebook Developer Console, go to **App Settings** → **Basic**
2. Under **App Domains**, add:
   ```
   lead-magnet-hub-shaamsarath1.replit.app
   ```
3. Click **Save Changes**

---

## Step 3 — Submit Permissions for App Review

1. In the Facebook Developer Console, go to **App Review** → **Permissions and Features**
2. Find each of these permissions and click **Request**:
   - `pages_show_list` — needed to list the business's Facebook Pages
   - `ads_read` — needed to access ad account data
3. For each permission, complete the required information:
   - **Detailed description**: Explain how your app uses the permission (e.g. "We use `pages_show_list` to let business owners select which of their Facebook Pages to connect to our ad management dashboard")
   - **Screencast**: Record a short video showing the OAuth flow and how the permission is used in the app
   - **Instructions for the reviewer**: Provide a test account if needed
4. Submit the review request

> Meta typically reviews submissions within 5 business days. You will receive an email when approved or if more info is needed.

---

## Step 4 — Switch App to Live Mode (after approval)

Once Meta approves both permissions:

1. In **App Settings** → **Basic**, find the **App Mode** toggle at the top
2. Switch from **Development** to **Live**
3. Confirm the prompt

After going Live, any Facebook user (not just listed testers/admins) can complete the OAuth flow.

---

## Permissions Being Requested

| Permission | Why it's needed |
|---|---|
| `pages_show_list` | Lists the Facebook Pages the business owner manages, so they can select which page to connect |
| `ads_read` | Reads ad account data (campaigns, spend, performance) so the dashboard can display their ad results |

---

## What's Already Done

- ✅ `APP_BASE_URL=https://lead-magnet-hub-shaamsarath1.replit.app` set in the production environment
- ✅ `fbAuth.ts` reads `APP_BASE_URL` and constructs the callback URL dynamically
- ✅ The callback URL is `https://lead-magnet-hub-shaamsarath1.replit.app/api/auth/facebook/callback`

## What Remains (manual steps in Facebook Developer Console)

- [ ] Add production callback URL to Facebook App's Valid OAuth Redirect URIs
- [ ] Add production domain to App Domains in App Settings → Basic
- [ ] Submit `pages_show_list` for App Review
- [ ] Submit `ads_read` for App Review
- [ ] Wait for Meta approval
- [ ] Switch app to Live mode
