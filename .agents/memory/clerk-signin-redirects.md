---
name: Clerk sign-in redirects
description: Redirect rule for public sign-in and protected deep links in Addlaunch.
---

Use Clerk’s forced redirect setting for a public sign-in destination; fallback redirects lose to OAuth return URLs. Preserve a requested protected Addlaunch route — including its query string and hash — in browser session storage before OAuth, then consume it once at the authenticated root route.

**Why:** External OAuth/terms callbacks can resume the URL where sign-in began and drop the page query string. A fallback destination therefore sent users back to the landing page, while a forced redirect alone could not reliably preserve a protected-page deep link.

**How to apply:** Default an intentional public landing-page sign-in to the dashboard. Accept and restore only known in-app protected paths, validate them before storing and before redirecting, and clear the saved path after it is consumed.