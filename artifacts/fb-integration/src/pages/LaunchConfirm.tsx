import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  DollarSign,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useCreateFbCampaign,
  useLaunchFbCampaign,
  useUpdateFbCampaign,
  type FbAdDraft,
  type FbCampaign,
} from "@workspace/api-client-react";

interface LaunchConfirmProps {
  adDraft: FbAdDraft;
  dailyBudget: number;
  radiusMiles: number;
  ageMin: number;
  ageMax: number;
  gender: "all";
  interests: string[];
  onReset: () => void;
  /** When set, patch-then-launch this existing campaign instead of creating a new one */
  campaignId?: number;
  /** Where ad clicks land — a HVCG lead magnet URL or other landing page */
  destinationUrl?: string;
  /** Business address string to geocode for targeting (from user's Profile) */
  businessLocation?: string;
}

type LaunchPhase = "geocoding" | "creating" | "launching" | "done" | "error";

/** Geocode an address string via our API server → Nominatim. Returns { lat, lng }. */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const params = new URLSearchParams({ address });
  const response = await fetch(`/api/geocode?${params.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        "Could not find coordinates for this address.",
    );
  }
  return response.json() as Promise<{ lat: number; lng: number }>;
}

export function LaunchConfirm({
  adDraft,
  dailyBudget,
  radiusMiles,
  ageMin,
  ageMax,
  gender,
  interests,
  onReset,
  campaignId,
  destinationUrl,
  businessLocation,
}: LaunchConfirmProps) {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<LaunchPhase>("geocoding");
  const [campaign, setCampaign] = useState<FbCampaign | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<string | null>(null);
  // Track whichever campaign ID was used/created so the Edit button can navigate
  // back to the wizard in edit mode even for campaigns created during this session.
  const [launchedCampaignId, setLaunchedCampaignId] = useState<number | null>(campaignId ?? null);
  const hasFired = useRef(false);

  const createCampaign = useCreateFbCampaign();
  const updateCampaign = useUpdateFbCampaign();
  const launchCampaign = useLaunchFbCampaign();

  const runLaunchSequence = async () => {
    if (hasFired.current) return;
    hasFired.current = true;

    try {
      // ── Step 1: Geocode the business location ──────────────────────────
      setPhase("geocoding");

      if (!businessLocation || businessLocation.trim() === "") {
        setErrorMessage(
          "Your business location is not set. Please go to Profile and add your business address, then try again.",
        );
        setPhase("error");
        return;
      }

      let lat: number;
      let lng: number;
      try {
        const coords = await geocodeAddress(businessLocation);
        lat = coords.lat;
        lng = coords.lng;
        setGeocodedLocation(businessLocation);
      } catch (geoErr: unknown) {
        const msg =
          geoErr instanceof Error
            ? geoErr.message
            : "Could not find coordinates for your business address.";
        setErrorMessage(
          `${msg} Please update your business location in Profile and try again.`,
        );
        setPhase("error");
        return;
      }

      const campaignFields = {
        headline: adDraft.headline,
        bodyText: adDraft.bodyText,
        imageUrl: adDraft.imageUrl,
        dailyBudgetCents: dailyBudget * 100,
        targetingRadiusMiles: radiusMiles,
        targetingAgeMin: ageMin,
        targetingAgeMax: ageMax,
        targetingGender: gender,
        targetingInterests: interests,
        targetingLatitude: lat,
        targetingLongitude: lng,
        ...(destinationUrl ? { destinationUrl } : {}),
      };

      // ── Step 2: Create or update the campaign ─────────────────────────
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
        // Remember the ID so the Edit button can navigate back in edit mode
        // even if the subsequent launch step fails.
        setLaunchedCampaignId(targetId);
      }

      // ── Step 3: Launch the campaign ───────────────────────────────────
      setPhase("launching");
      const launched = await launchCampaign.mutateAsync({ id: targetId });
      setCampaign(launched);
      if (launched.status === "error") {
        setErrorMessage(
          launched.errorMessage ??
            "Facebook rejected the ad. Please review the ad details and try again.",
        );
        setPhase("error");
        return;
      }
      setPhase("done");
    } catch (err: unknown) {
      const apiError = err as {
        message?: string;
        response?: { data?: { error?: string } };
        data?: { error?: string };
      };
      const message =
        apiError?.response?.data?.error ??
        apiError?.data?.error ??
        apiError?.message ??
        "Failed to submit ad. Please try again.";
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
    setPhase("geocoding");
    setErrorMessage(null);
    setCampaign(null);
    runLaunchSequence();
  };

  /* ── Loading state ─────────────────────────────────────────── */
  if (phase === "geocoding" || phase === "creating" || phase === "launching") {
    const stepLabel =
      phase === "geocoding"
        ? "Finding your business location…"
        : phase === "creating"
          ? "Saving ad…"
          : "Submitting to Facebook…";
    const stepSub =
      phase === "geocoding"
        ? "Converting your address to map coordinates"
        : phase === "creating"
          ? "Saving your ad details"
          : "Handing off to the Facebook Ads system";

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submitting Ad…</h2>
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
              <p className="font-semibold">{stepLabel}</p>
              <p className="text-sm text-muted-foreground mt-1">{stepSub}</p>
            </div>
            <div className="flex gap-2 mt-2">
              {(["geocoding", "creating", "launching"] as const).map((p) => {
                const steps = ["geocoding", "creating", "launching"] as const;
                const currentIdx = steps.indexOf(phase);
                const thisIdx = steps.indexOf(p);
                return (
                  <div
                    key={p}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      thisIdx === currentIdx
                        ? "bg-primary"
                        : thisIdx < currentIdx
                          ? "bg-primary/40"
                          : "bg-border"
                    }`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Error state ───────────────────────────────────────────── */
  if (phase === "error") {
    const isLocationError =
      errorMessage?.toLowerCase().includes("location") ||
      errorMessage?.toLowerCase().includes("address") ||
      errorMessage?.toLowerCase().includes("profile");

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
                <p className="font-semibold text-destructive">Ad could not be submitted</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={onReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
              {isLocationError ? (
                <Button
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Update Profile
                </Button>
              ) : (
                launchedCampaignId && (
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/campaign/new?edit=${launchedCampaignId}`)}
                    className="gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Ad
                  </Button>
                )
              )}
              {!isLocationError && (
                <Button onClick={handleTryAgain} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Build Ads Manager deep-link ──────────────────────────── */
  const adsManagerHref = (() => {
    if (campaign?.partnerCampaignId) {
      // Deep-link directly to the submitted campaign
      return `https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campaign.partnerCampaignId}`;
    }
    return "https://adsmanager.facebook.com/adsmanager/manage/campaigns";
  })();

  /* ── Success state ─────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <CheckCircle2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Ad submitted for review!</h2>
        <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
          Your ad is ready in Facebook Ads Manager — review it there and turn it on when you're ready.
          No budget will be spent until you activate it.
        </p>
        {campaign && (
          <Badge className="mt-3 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
            Awaiting Activation
          </Badge>
        )}
      </div>

      {/* Primary CTA — Ads Manager */}
      <a
        href={adsManagerHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 flex items-center gap-4 hover:border-primary/60 hover:bg-primary/10 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-primary">Review in Facebook Ads Manager</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Check your ad creative, targeting, and budget — then click the toggle to go live.
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-primary/60 shrink-0" />
        </div>
      </a>

      {/* Campaign summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Summary</CardTitle>
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
          {geocodedLocation && (
            <div className="p-3 rounded-lg bg-secondary/30 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Targeting center</p>
                <p className="font-medium text-sm truncate">{geocodedLocation}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-xs text-muted-foreground">Age range</p>
              <p className="font-semibold text-sm">{ageMin}–{ageMax}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-xs text-muted-foreground">Gender</p>
              <p className="font-semibold text-sm">Everyone</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Interests</p>
            <p className="font-medium text-sm">
              {interests.length > 0 ? interests.join(", ") : "All interests"}
            </p>
          </div>
          {destinationUrl && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ad destination</p>
                <p className="font-medium text-sm truncate text-primary">{destinationUrl}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What happens next */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-amber-900">What happens next</p>
          <ol className="space-y-2">
            {[
              "Open Facebook Ads Manager using the button above",
              "Find your ad and review the creative and settings",
              "Toggle the shared campaign to Active — all your ads start running immediately",
              "Come back here and hit Refresh Status to see it go live",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="gap-2 flex-1" asChild>
          <a
            href={adsManagerHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4" />
            Open Ads Manager
          </a>
        </Button>
        <Button
          className="flex-1"
          onClick={() => setLocation("/campaigns")}
        >
          See All Ads
        </Button>
      </div>
    </div>
  );
}
