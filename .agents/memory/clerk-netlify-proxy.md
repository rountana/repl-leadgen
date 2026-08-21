---
name: Clerk behind Netlify
description: The constraints for serving Replit-managed Clerk through vibeengg.com while Netlify proxies to a generated Replit deployment.
---

When Netlify reverse-proxies the public site to the generated Replit deployment, Replit-managed Clerk must retain its injected production proxy URL and use the deployment forwarding host for proxy attribution.

**Why:** Rewriting Clerk's proxy URL or proxy host to the Netlify browser origin makes the managed Clerk Frontend API unable to attribute the request to its Replit-provisioned instance.

**How to apply:** Pass `VITE_CLERK_PROXY_URL` to `<ClerkProvider>` unchanged and resolve the API proxy host from `x-forwarded-host`/`Host`, never browser `Origin`. Do not alter Replit-managed Clerk secrets.