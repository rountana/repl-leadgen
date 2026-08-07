import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Zap,
  DollarSign,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateFbCampaign,
  useLaunchFbCampaign,
  useUpdateFbCampaign,
  useGetFbCampaignLeadStatus,
  getGetFbCampaignLeadStatusQueryKey,
  type FbAdDraft,
  type FbCampaign,
} from "@workspace/api-client-react";

interface LaunchConfirmProps {
  adDraft: FbAdDraft;
  dailyBudget: number;
  radiusMiles: number;
  onReset: () => void;
  /** When set, patch-then-launch this existing campaign instead of creating a new one */
  campaignId?: number;
}

type LaunchPhase = "creating" | "launching" | "done" | "error";

export function LaunchConfirm({ adDraft, dailyBudget, radiusMiles, onReset, campaignId }: LaunchConfirmProps) {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<LaunchPhase>("creating");
  const [campaign, setCampaign] = useState<FbCampaign | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasFired = useRef(false);

  const createCampaign = useCreateFbCampaign();
  const updateCampaign = useUpdateFbCampaign();
  const launchCampaign = useLaunchFbCampaign();

  const { data: leadStatus, isLoading: isLeadLoading } = useGetFbCampaignLeadStatus(
    campaign?.id ?? 0,
    { query: { queryKey: getGetFbCampaignLeadStatusQueryKey(campaign?.id ?? 0), enabled: !!campaign && phase === "done" } },
  );

  const campaignFields = {
    headline: adDraft.headline,
    bodyText: adDraft.bodyText,
    imageUrl: adDraft.imageUrl,
    dailyBudgetCents: dailyBudget * 100,
    targetingRadiusMiles: radiusMiles,
    targetingLatitude: 37.7749,  // Phase 1 mock — geocoded from connection in Phase 2
    targetingLongitude: -122.4194,
  };

  const runLaunchSequence = async () => {
    if (hasFired.current) return;
    hasFired.current = true;

    try {
      let targetId: number;

      if (campaignId) {
        // Edit & retry mode — patch the existing campaign then launch it
        setPhase("creating");
        await updateCampaign.mutateAsync({ id: campaignId, data: campaignFields });
        targetId = campaignId;
      } else {
        // New campaign mode — create then launch
        setPhase("creating");
        const newCampaign = await createCampaign.mutateAsync({ data: campaignFields });
        targetId = newCampaign.id;
      }

      setPhase("launching");
      const launched = await launchCampaign.mutateAsync({ id: targetId });
      setCampaign(launched);
      setPhase("done");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to launch campaign. Please try again.";
      setErrorMessage(message);
      setPhase("error");
    }
  };

  useEffect(() => {
    runLaunchSequence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTryAgain = () => {
    hasFired.current = false;
    setPhase("creating");
    setErrorMessage(null);
    setCampaign(null);
    runLaunchSequence();
  };

  /* ── Loading state ─────────────────────────────────────────── */
  if (phase === "creating" || phase === "launching") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Launching Campaign…</h2>
          <p className="text-muted-foreground mt-1">This usually takes just a moment.</p>
        </div>
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold">
                {phase === "creating" ? "Creating campaign…" : "Submitting to Facebook…"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {phase === "creating"
                  ? "Setting up your campaign"
                  : "Handing off to the Facebook Ads system"}
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {(["creating", "launching"] as const).map((p) => (
                <div
                  key={p}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    phase === p ? "bg-primary" : p === "creating" && phase === "launching" ? "bg-primary/40" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Error state ───────────────────────────────────────────── */
  if (phase === "error") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Launch Failed</h2>
          <p className="text-muted-foreground mt-1">Something went wrong. You can try again below.</p>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Campaign could not be launched</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
              <Button onClick={handleTryAgain} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Success state ─────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Your campaign is live!</h2>
        <p className="text-muted-foreground mt-1">
          Facebook is reviewing your ad — it typically goes live within minutes.
        </p>
        {campaign && (
          <Badge className="mt-3 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            {campaign.status === "live" ? "Live" : campaign.status === "launching" ? "In Review" : campaign.status}
          </Badge>
        )}
      </div>

      {/* Campaign summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground mb-1">Headline</p>
            <p className="font-semibold text-sm">{adDraft.headline}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Daily budget</p>
                <p className="font-semibold text-sm">${dailyBudget}/day</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Radius</p>
                <p className="font-semibold text-sm">{radiusMiles} miles</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead delivery status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Lead Delivery Verification</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLeadLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ) : leadStatus?.status === "active" ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-green-800">Leads flowing in real time</p>
                <p className="text-xs text-green-700/80 mt-0.5">
                  Lead delivery is confirmed and working correctly.
                </p>
              </div>
            </div>
          ) : (
            /* failed or unverified — never silently pass */
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-amber-800">
                    {leadStatus?.status === "failed"
                      ? "Lead delivery failed"
                      : "Lead delivery not yet verified"}
                  </p>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    {leadStatus?.status === "failed"
                      ? "Your campaign is live but leads aren't reaching your account. Contact support to resolve this."
                      : "Verification is pending. This usually resolves within a few minutes after the campaign goes live."}
                  </p>
                </div>
              </div>
              {leadStatus?.status === "failed" && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="mailto:support@example.com">Contact Support</a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="gap-2 flex-1" asChild>
          {/* Phase 1 stub — real URL comes from campaign.partnerCampaignId in Phase 2 */}
          <a
            href="https://www.facebook.com/adsmanager"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4" />
            View in Facebook Ads Manager
          </a>
        </Button>
        <Button
          className="flex-1"
          onClick={() => setLocation("/campaigns")}
        >
          See All Campaigns
        </Button>
      </div>
    </div>
  );
}
