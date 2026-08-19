const ADS_MANAGER_CAMPAIGNS_URL =
  "https://adsmanager.facebook.com/adsmanager/manage/campaigns";

/** Real Meta ad accounts use the act_<digits> format. */
export function isRealAdAccountId(id: string | null | undefined): boolean {
  return /^act_\d+$/.test(id ?? "");
}

/**
 * Opens Ads Manager in a connected ad account when it is known, while also
 * selecting the campaign that was just submitted when Meta returned one.
 */
export function adsManagerUrl(
  adAccountId?: string | null,
  partnerCampaignId?: string | null,
): string {
  const params = new URLSearchParams();

  if (adAccountId && isRealAdAccountId(adAccountId)) {
    params.set("act", adAccountId.slice("act_".length));
  }

  const campaignId = partnerCampaignId?.trim();
  if (campaignId) {
    params.set("selected_campaign_ids", campaignId);
  }

  const query = params.toString();
  return query ? `${ADS_MANAGER_CAMPAIGNS_URL}?${query}` : ADS_MANAGER_CAMPAIGNS_URL;
}