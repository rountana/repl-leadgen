---
name: Clerk behind Netlify
description: The constraints for serving Replit-managed Clerk through vibeengg.com while Netlify proxies to a generated Replit deployment.
---

When Netlify reverse-proxies the public site to the generated Replit deployment, Clerk browser requests must remain same-origin at the visitor-facing domain, and the API may treat only the approved HTTPS public origin as the Clerk proxy host.

**Why:** Replit’s deployment edge replaces ordinary forwarded-host headers with the generated `.replit.app` host. Clerk then rejects `Origin: https://vibeengg.com` because it does not match the proxy URL. Trusting arbitrary Origin headers would turn that validation into a bypass.

**How to apply:** Preserve the injected Clerk proxy path but rebuild its origin from `window.location.origin` only when the configured production origin differs. On the API proxy, recognize `vibeengg.com` only after parsing a valid HTTPS Origin header; all other origins must retain the normal generated deployment host. Netlify’s existing 200-status rewrites route the same-origin `/api/__clerk` request to Replit; no Clerk secret should be altered.