---
name: HVCG ↔ Facebook Ads integration
description: Product-level routing and handoff rules between the lead-magnet builder and Facebook Ads app.
---

## Integration rule

The lead-magnet builder and Facebook Ads wizard are separate applications but one user flow. A live lead magnet can launch directly into a prefilled Facebook-ad draft, and the ads flow can select a live lead magnet as its destination.

**Why:** Ad clicks should reach the business owner's offer page rather than a generic Facebook Page, while still letting a user choose or create the offer from either part of the product.

**How to apply:** Preserve the lead magnet's title, description, and public destination URL through cross-app navigation. On the public branded domain, use the `/lm` and `/fb` aliases; retain the nested application routes as compatibility paths.
