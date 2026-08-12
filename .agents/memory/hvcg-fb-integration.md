---
name: HVCG ↔ Facebook Ads integration
description: How the two artifacts are linked — deep link params, destinationUrl flow, and cross-artifact navigation.
---

## The integration pattern

Two entry points, both fully implemented:

**A. HVCG → fb-integration (deep link)**
- `artifacts/hvcg/src/pages/Live.tsx` — "Create Facebook Ad" button uses `window.location.href = /fb/campaign/new?magnet_title=...&magnet_url=...&magnet_desc=...`
- `CampaignWizard.tsx` reads these params from `useSearch()`, skips the template gallery, and pre-fills `adDraft` (headline from title, bodyText from desc, destinationUrl from url)

**B. fb-integration → HVCG (inline picker)**
- `artifacts/fb-integration/src/components/LeadMagnetPicker.tsx` — uses `useListLeadMagnets`, filters to `status === "live" && shareUrl`, renders selectable cards
- Embedded in `AdPreview.tsx` as a collapsible "Link a Lead Magnet" card
- "Create a new one" link opens `/hvcg/new` in a new tab

## destinationUrl flow
- Column: `fb_campaigns.destination_url text` (added via drizzle push)
- Wizard state: `WizardState.destinationUrl: string`
- `AdPreview.onNext(adDraft, destinationUrl)` — signature includes destinationUrl
- `LaunchConfirm` accepts `destinationUrl?: string`, passes it into `campaignFields`
- `CreateFbCampaignBody` / `UpdateFbCampaignBody` both accept optional `destinationUrl`
- `fbPartnerAdapter.CreateCampaignParams.destinationUrl?` — used in `link_data.link`; falls back to `https://www.facebook.com/{fbPageId}` if absent

**Why:** Ad clicks should land on the user's lead magnet page, not their Facebook Page. The destination URL is the bridge between the two products.
