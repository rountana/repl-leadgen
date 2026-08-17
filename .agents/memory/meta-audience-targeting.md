---
name: Meta audience targeting
description: Non-obvious Meta Ads API behavior used by the campaign targeting flow.
---

Meta accepts a specific integer `age_min` and `age_max` range rather than requiring preset age bands. In the current product, the supported UI range is 18 through 65, with 65 representing Meta's upper-age bucket.

Gender targeting uses Meta IDs: `1` for men and `2` for women. Everyone should be represented by omitting the `genders` field, not by sending an empty array.

**Why:** Sending the wrong gender shape can silently change audience behavior or cause Meta validation errors; per-year age values let the product offer more useful ranges than fixed presets.

**How to apply:** Keep the user-facing gender values `all`, `male`, and `female`; translate them only in the Meta adapter and preserve `all` as the unrestricted default.