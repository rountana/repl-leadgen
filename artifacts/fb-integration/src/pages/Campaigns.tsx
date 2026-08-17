import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  DollarSign,
  MapPin,
  Zap,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Pencil,
  Loader2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFbCampaigns,
  useLaunchFbCampaign,
  useSyncFbCampaigns,
  useGetFbConnection,
  useDeleteFbCampaign,
  getListFbCampaignsQueryKey,
  type FbCampaign,
  type FbCampaignStatus,
  type FbCampaignLeadDeliveryStatus,
} from "@workspace/api-client-react";

function adsManagerUrl(adAccountId?: string | null, partnerCampaignId?: string | null): string {
  const act = adAccountId?.replace(/^act_/, "");
  if (act && partnerCampaignId) {
    return `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${act}&selected_campaign_ids=${partnerCampaignId}`;
  }
  if (act) {
    return `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${act}`;
  }
  return "https://adsmanager.facebook.com/adsmanager/manage/campaigns";
}

// ─── Shared state palettes ───────────────────────────────────────────────────
// Three semantic states each get one consistent colour across every surface.
const STATE_THEME = {
  live:    { cardAccent: "border-l-4 border-l-green-400", panel: "bg-green-50 border-green-100", divider: "border-green-100", badge: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100", label: "text-green-700" },
  pending: { cardAccent: "border-l-4 border-l-amber-400", panel: "bg-amber-50 border-amber-100", divider: "border-amber-100", badge: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100", label: "text-amber-700" },
  failed:  { cardAccent: "border-l-4 border-l-red-400",   panel: "bg-red-50 border-red-100",     divider: "border-red-100",   badge: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",       label: "text-red-700"   },
  neutral: { cardAccent: "",                               panel: "bg-muted/30 border-border/50", divider: "border-border/50", badge: "bg-muted text-muted-foreground border-border hover:bg-muted",    label: "text-muted-foreground" },
} as const;

function statusTheme(status: FbCampaignStatus) {
  if (status === "live")                    return STATE_THEME.live;
  if (status === "paused" || status === "launching") return STATE_THEME.pending;
  if (status === "error")                   return STATE_THEME.failed;
  return STATE_THEME.neutral;
}

function StatusBadge({ status }: { status: FbCampaignStatus }) {
  const t = statusTheme(status);
  switch (status) {
    case "live":      return <Badge className={`${t.badge} gap-1`}><CheckCircle2 className="w-3 h-3" /> Live</Badge>;
    case "launching": return <Badge className={`${t.badge} gap-1`}><Clock className="w-3 h-3" /> Launching</Badge>;
    case "paused":    return <Badge className={`${t.badge} gap-1`}><FileText className="w-3 h-3" /> Draft</Badge>;
    case "error":     return <Badge className={`${t.badge} gap-1`}><AlertTriangle className="w-3 h-3" /> Launch failed</Badge>;
    default:          return <Badge className={`${t.badge} gap-1`}><FileText className="w-3 h-3" /> Draft</Badge>;
  }
}

function LeadDeliveryPill({ status }: { status: FbCampaignLeadDeliveryStatus }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          <Zap className="w-3 h-3" /> Leads active
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
          <AlertTriangle className="w-3 h-3" /> Delivery failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          <Clock className="w-3 h-3" /> Verifying leads
        </span>
      );
  }
}

function CampaignCard({ campaign, adAccountId, sharedCampaignId }: { campaign: FbCampaign; adAccountId?: string | null; sharedCampaignId?: string | null }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const launch = useLaunchFbCampaign({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFbCampaignsQueryKey() }),
    },
  });
  const deleteCampaign = useDeleteFbCampaign({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFbCampaignsQueryKey() }),
      onError: () => setConfirmDelete(false),
    },
  });

  const dailyBudgetDollars = campaign.dailyBudgetCents
    ? Math.round(campaign.dailyBudgetCents / 100)
    : null;

  const theme = statusTheme(campaign.status);

  // Items that go in the ⋯ corner menu
  const canEdit = campaign.status === "paused" || campaign.status === "error" || campaign.status === "draft";
  const canDelete = campaign.status !== "live" && campaign.status !== "launching";

  // Primary action shown in the bottom-right of the card
  const primaryAction = campaign.status === "live" ? (
    <Button variant="outline" size="sm" className="gap-1.5 bg-background shrink-0" asChild>
      <a href={adsManagerUrl(adAccountId, sharedCampaignId ?? campaign.partnerCampaignId)} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-3.5 h-3.5" /> View in Ads Manager
      </a>
    </Button>
  ) : campaign.status === "paused" ? (
    <Button variant="outline" size="sm" className="gap-1.5 bg-background shrink-0" asChild>
      <a href={adsManagerUrl(adAccountId, sharedCampaignId ?? campaign.partnerCampaignId)} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-3.5 h-3.5" /> Activate in Ads Manager
      </a>
    </Button>
  ) : campaign.status === "error" ? (
    <Button size="sm" variant="outline" className="gap-1.5 bg-background shrink-0" disabled={launch.isPending} onClick={() => launch.mutate({ id: campaign.id })}>
      {launch.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Retrying…</> : <><RefreshCw className="w-3.5 h-3.5" />Retry</>}
    </Button>
  ) : null;

  // Text/pill shown beside the chip in the bottom strip
  const statusNote = campaign.status === "error" && campaign.errorMessage ? (
    <span className="text-xs text-muted-foreground leading-snug">
      {campaign.errorMessage.length > 100 ? campaign.errorMessage.slice(0, 100) + "…" : campaign.errorMessage}
    </span>
  ) : campaign.status === "paused" ? (
    <span className={`text-xs font-medium ${theme.label}`}>Ready to go live</span>
  ) : campaign.status === "launching" ? (
    <span className="text-xs text-muted-foreground">Under review · usually live within minutes</span>
  ) : campaign.status === "live" ? (
    <LeadDeliveryPill status={campaign.leadDeliveryStatus} />
  ) : null;

  return (
    <Card className={`overflow-hidden transition-colors ${theme.cardAccent} relative`}>
      <CardContent className="p-5 space-y-3">

        {/* ⋯ corner menu */}
        {(canEdit || canDelete) && !confirmDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="absolute top-3 right-3 w-7 h-7 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setLocation(`/campaign/new?edit=${campaign.id}`)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Title + body — pad right so text doesn't run under the ⋯ button */}
        <div className="pr-8">
          <h3 className="font-bold text-base leading-tight">
            {campaign.headline ?? "Untitled Ad"}
          </h3>
          {campaign.bodyText && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {campaign.bodyText}
            </p>
          )}
        </div>

        {/* Budget / radius */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {dailyBudgetDollars !== null && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />${dailyBudgetDollars}/day
            </span>
          )}
          {campaign.targetingRadiusMiles != null && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />{campaign.targetingRadiusMiles} mi radius
            </span>
          )}
        </div>

        {/* Bottom strip — chip + status note on the left, primary action on the right */}
        {confirmDelete ? (
          <div className={`rounded-lg border p-3 space-y-2 ${theme.panel}`}>
            <p className="text-xs text-center text-muted-foreground leading-snug">
              {campaign.status === "paused"
                ? "Remove from this app? The paused campaign in Ads Manager won't be affected."
                : "Remove this ad from the app?"}
            </p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7 bg-background" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button size="sm" variant="destructive" className="flex-1 text-xs h-7" disabled={deleteCampaign.isPending} onClick={() => deleteCampaign.mutate({ id: campaign.id })}>
                {deleteCampaign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-between gap-3 pt-3 border-t ${theme.divider}`}>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <StatusBadge status={campaign.status} />
              {statusNote}
            </div>
            {primaryAction}
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export function Campaigns() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const { data: campaigns, isLoading, isError, refetch } = useListFbCampaigns();
  const { data: connection } = useGetFbConnection();

  const sync = useSyncFbCampaigns({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFbCampaignsQueryKey() });
        setLastSynced(new Date());
      },
    },
  });

  const hasSyncable = campaigns?.some(
    (c) => c.status === "live" || c.status === "launching" || c.status === "paused",
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Ads</h1>
          <p className="text-muted-foreground mt-1">
            Track your Facebook ads and lead delivery status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSyncable && (
            <div className="flex flex-col items-end gap-0.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={sync.isPending}
                onClick={() => sync.mutate()}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
                {sync.isPending ? "Refreshing…" : "Refresh Status"}
              </Button>
              {lastSynced && (
                <span className="text-xs text-muted-foreground">
                  Last synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
          <Button onClick={() => setLocation("/campaign/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Ad
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-40 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-semibold">Failed to load ads</p>
            <p className="text-sm text-muted-foreground">There was a problem fetching your ads.</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      ) : !campaigns || campaigns.length === 0 ? (
        /* Empty state */
        <Card className="bg-secondary/30 border-dashed border-2 py-16 text-center">
          <CardContent className="flex flex-col items-center p-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <TrendingUp className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No ads yet</h3>
            <p className="text-muted-foreground max-w-sm mb-8">
              Create your first Facebook ad to start reaching local customers and capturing leads.
            </p>
            <Button onClick={() => setLocation("/campaign/new")} size="lg" className="gap-2">
              Create Your First Ad
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              adAccountId={connection?.adAccountId}
              sharedCampaignId={connection?.partnerCampaignId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
