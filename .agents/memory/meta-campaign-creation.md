---
name: Meta campaign creation pitfalls
description: What parameters cause error 100/4834011 on ensureCampaign(), and which objective to use.
---

## Rule

Use `objective: "OUTCOME_TRAFFIC"` and omit `campaign_budget_optimization` and `buying_type` entirely.

**Why:** Meta error 100/4834011 ("Invalid parameter") is triggered by passing `campaign_budget_optimization: false` or `buying_type: "AUCTION"` explicitly — both are defaults that many accounts reject when set by the caller. These two parameters were the actual root cause of the original submission failures. `OUTCOME_TRAFFIC` is correct for Performance 5 accounts (Meta API v14+, the current standard); `LINK_CLICKS` (the legacy objective) is now invalid on these accounts and returns code 100 with the message listing the valid `OUTCOME_*` values.

**How to apply:** The minimal working campaign creation payload is:
```json
{
  "name": "Lead Gen — Shared Campaign",
  "objective": "OUTCOME_TRAFFIC",
  "special_ad_categories": [],
  "status": "PAUSED"
}
```
Do not add `campaign_budget_optimization`, `buying_type`, or any budget field to the campaign. Budget lives on the ad set (ASBO mode).
