---
name: Clerk behind Netlify
description: The constraints for serving Replit-managed Clerk through vibeengg.com while Netlify proxies to a generated Replit deployment.
---

When Netlify reverse-proxies the public site to the generated Replit deployment, Replit-managed Clerk needs a same-origin browser proxy URL plus the generated deployment host for server-side proxy attribution.

**Why:** A raw injected `.replit.app` proxy URL makes Replit reject the `vibeengg.com` Origin header, while changing the server attribution host to `vibeengg.com` makes Clerk reject the request as belonging to an unknown instance.

**How to apply:** On an approved reverse-proxy domain, rebuild the injected proxy URL with `window.location.origin` while preserving its path; on the API, resolve `Clerk-Proxy-Url` from `x-forwarded-host`/`Host`, never browser `Origin`. Do not alter Replit-managed Clerk secrets.