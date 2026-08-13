---
name: Paused campaign submission
description: Campaigns are submitted to Meta as PAUSED, not ACTIVE. User activates in Ads Manager.
---

# Paused Campaign Submission

## Rule
All three Meta objects (campaign, ad set, ad) are created with `status: "PAUSED"`. No budget is spent at submission time. The user reviews and activates in Ads Manager.

**Why:** Prevents accidental spend, lets the user review creative/targeting before going live, and sidesteps Meta's immediate delivery-check rejection that triggered `subcode 1885272`.

**How to apply:** `fbPartnerAdapter.ts` already sends `PAUSED` — never change this back to `ACTIVE` without a deliberate product decision.

## IDs stored
Three Meta IDs are now persisted per campaign: `partnerCampaignId`, `partnerAdSetId`, `partnerAdId`. All three are returned from `createCampaign()` and written to `fb_campaigns` during the launch route.

## verifyLeadDelivery return
Now returns `{ active: boolean, paused: boolean, checkedAt: string }`. The sync route maps:
- `active: true` → status `"live"`, leadDelivery `"active"`
- `active: false, paused: true` → status `"paused"`, leadDelivery `"unverified"` (awaiting activation, NOT a failure)
- `active: false, paused: false` → status stays `"paused"`, leadDelivery `"failed"` (something wrong)

## Status values
Internal campaign status: `draft → launching → paused → live | error`. `"paused"` now means "submitted to Meta but not yet activated by the user", not "broken".
