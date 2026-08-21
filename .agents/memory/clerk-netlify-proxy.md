---
name: Direct branded-domain auth
description: The constraints for serving Replit-managed Clerk and Facebook OAuth on addlaun.ch directly from the Replit deployment.
---

Addlaunch is served directly by Replit on its branded domain; Netlify is not part of the active request path. Replit-managed Clerk needs a same-origin browser proxy URL that is attributed to the browser-facing host.

**Why:** Clerk validates the request `Origin` against `Clerk-Proxy-Url`. Pinning server-side proxy attribution to the generated `.replit.app` host while the browser is on `addlaun.ch` causes Clerk to reject the request with `origin_invalid`.

**How to apply:** Keep browser Clerk requests on the current origin under `/api/__clerk`; derive `Clerk-Proxy-Url` from the leftmost `x-forwarded-host` (the original browser host), never pin it to the generated deployment host. Restrict Clerk and Facebook OAuth return origins to `https://addlaun.ch` and the generated deployment origin. Do not alter Replit-managed Clerk secrets.