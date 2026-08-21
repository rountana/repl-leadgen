---
name: Direct branded-domain auth
description: The constraints for serving Replit-managed Clerk and Facebook OAuth on addlaun.ch directly from the Replit deployment.
---

Addlaunch is served directly by Replit on its branded domain; Netlify is not part of the active request path. Replit-managed Clerk still needs a same-origin browser proxy URL plus the generated deployment host for server-side proxy attribution.

**Why:** The branded domain must not change the managed Clerk instance identity. Sending browser requests to the generated host breaks same-origin expectations, while identifying Clerk requests as the branded host makes Clerk reject them as a different instance.

**How to apply:** Keep browser Clerk requests on the current origin under `/api/__clerk`; in production, pin `Clerk-Proxy-Url` to the generated Replit deployment host. Restrict Clerk and Facebook OAuth return origins to `https://addlaun.ch` and the generated deployment origin. Do not alter Replit-managed Clerk secrets.