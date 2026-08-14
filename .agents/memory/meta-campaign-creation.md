---
name: Meta campaign creation pitfalls
description: Required parameters and pitfalls for ensureCampaign() — what causes error 100/4834011.
---

## Rule

Use `objective: "OUTCOME_TRAFFIC"` and include `is_adset_budget_sharing_enabled: false`. Omit `campaign_budget_optimization` and `buying_type` entirely.

**Why:** Meta error 100/4834011 with the user message "Must specify True or False in is_adset_budget_sharing_enabled" — this field is **required** when not using campaign-level budget (ASBO mode). Meta does not infer a default; omitting it causes the campaign creation call to fail. Additionally, passing `campaign_budget_optimization: false` or `buying_type: "AUCTION"` explicitly also triggers 4834011 on many accounts — both are defaults that should not be sent.

`OUTCOME_TRAFFIC` is correct for Performance 5 accounts (Meta API v14+, the current standard). `LINK_CLICKS` (legacy) is rejected on these accounts.

**How to apply:** The minimal working campaign creation payload for ASBO mode:
```json
{
  "name": "Lead Gen — Shared Campaign",
  "objective": "OUTCOME_TRAFFIC",
  "special_ad_categories": [],
  "is_adset_budget_sharing_enabled": false,
  "status": "PAUSED"
}
```
- `is_adset_budget_sharing_enabled: false` = each ad set controls its own `daily_budget` independently
- `is_adset_budget_sharing_enabled: true` = ad sets share 20% of their budgets (not what we want)
- Do NOT add `campaign_budget_optimization`, `buying_type`, or a campaign-level `daily_budget`

**Debugging tip:** The `graphPost` function logs the full `metaError` object including `error_user_msg` which contains the plain-English explanation of what's missing. Always check that field first when diagnosing new Meta errors.
