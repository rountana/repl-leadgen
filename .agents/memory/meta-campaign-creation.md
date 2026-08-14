---
name: Meta campaign creation pitfalls
description: Required parameters, pitfalls for ensureCampaign(), and per-account campaign storage.
---

## Campaign storage: per (connection, ad_account)

Campaigns are stored in `fb_connection_campaigns(connection_id, ad_account_id, partner_campaign_id)` with a UNIQUE index on `(connection_id, ad_account_id)`. Never use `fb_connections.partnerCampaignId` for new campaigns — it is a legacy deprecated column. The `getStoredCampaignId(connectionId, adAccountId)` helper in `fb.ts` handles the lookup.

**Why:** One `fb_connections` row per user, but a user can have multiple ad accounts. Storing a single `partnerCampaignId` on the connection caused "This campaign belongs to a different account" errors when switching accounts.

**Atomicity:** New account → INSERT ON CONFLICT DO NOTHING, then read winner. Deleted campaign → UPDATE WHERE partner_campaign_id = $oldId, then read winner if 0 rows updated.

---

## ensureCampaign() required payload

```json
{
  "name": "Lead Gen — Shared Campaign",
  "objective": "OUTCOME_TRAFFIC",
  "special_ad_categories": [],
  "is_adset_budget_sharing_enabled": false,
  "status": "PAUSED"
}
```

- `OUTCOME_TRAFFIC` — Performance 5 objective (Meta API v14+). `LINK_CLICKS` is rejected on migrated accounts.
- `is_adset_budget_sharing_enabled: false` — **required** when not using campaign-level budget (ASBO mode). Omitting it causes error 100/4834011 with message "Must specify True or False in is_adset_budget_sharing_enabled".
- Do NOT pass `campaign_budget_optimization` or `buying_type` — both trigger 4834011 on many accounts.

**Debugging tip:** `graphPost` logs the full `metaError` object including `error_user_msg` (plain English). Check that field first when diagnosing new Meta errors.
