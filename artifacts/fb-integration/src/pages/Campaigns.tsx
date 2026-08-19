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
  BarChart3,
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
import { adsManagerUrl, isRealAdAccountId } from "@/lib/adsManagerUrl";

// ─── Shared state palettes ───────────────────────────────────────────────────
// Three semantic states each get one consistent colour across every surface.
const STATE_THEME = {
  live:    { cardAccent: "border-l-4 border-l-green-400", panel: "bg-green-50 border-green-100", divider: "border-green-100", badge: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100", label: "text-green-700" },
  pending: { cardAccent: "border-l-4 border-l-amber-400", panel: "bg-amber-50 border-amber-100", divider: "border-amber-100", badge: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100", label: "text-amber-700" },
  failed:  { cardAccent: "border-l-4 border-l-accent",    panel: "bg-accent/5 border-accent/20", divider: "border-accent/20", badge: "bg-accent/10 text-accent border-accent/25 hover:bg-accent/15", label: "text-accent" },
  neutral: { cardAccent: "",                               panel: "bg-muted/30 border-border/50", divider: "border-border/50", badge: "bg-muted text-muted-foreground border-border hover:bg-muted",    label: "text-muted-foreground" },
} as const;

function statusTheme(status: FbCampaignStatus) {
  if (status === "live")                              return STATE_THEME.live;
  if (status === "paused" || status === "launching" || status === "in_review") return STATE_THEME.pending;
  if (status === "error")                             return STATE_THEME.failed;
  return STATE_THEME.neutral;
}

function StatusBadge({ status }: { status: FbCampaignStatus }) {
  const t = statusTheme(status);
  switch (status) {
    case "live":      return <Badge className={`${t.badge} gap-1`}><CheckCircle2 className="w-3 h-3" /> Live</Badge>;
    case "launching": return <Badge className={`${t.badge} gap-1`}><Clock className="w-3 h-3" /> Launching</Badge>;
    case "paused":    return <Badge className={`${t.badge} gap-1`}><Clock className="w-3 h-3" /> Paused</Badge>;
    case "in_review": return <Badge className={`${t.badge} gap-1`}><Clock className="w-3 h-3" /> In review</Badge>;
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
  const canDelete = campaign.status !== "live" && campaign.status !== "launching" && campaign.status !== "in_review";

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
  ) : campaign.status === "in_review" ? (
    <Button variant="outline" size="sm" className="gap-1.5 bg-background shrink-0" asChild>
      <a href={adsManagerUrl(adAccountId, sharedCampaignId ?? campaign.partnerCampaignId)} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-3.5 h-3.5" /> View in Ads Manager
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
    <span className={`text-xs font-medium ${theme.label}`}>Activate in Ads Manager to go live</span>
  ) : campaign.status === "in_review" ? (
    <span className={`text-xs font-medium ${theme.label}`}>Meta is reviewing · usually live within 24 h</span>
  ) : campaign.status === "launching" ? (
    <span className="text-xs text-muted-foreground">Submitting to Meta…</span>
  ) : campaign.status === "live" ? (
    <LeadDeliveryPill status={campaign.leadDeliveryStatus} />
  ) : null;

  return (
    <Card className={`overflow-hidden border-border/50 shadow-sm transition-all hover:border-primary/50 hover:shadow-md ${theme.cardAccent}`}>
      <div className="flex flex-col sm:flex-row">
        <CardContent className="min-w-0 flex-1 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={campaign.status} />
              </div>
              <h3 className="font-bold text-xl leading-tight">
                {campaign.headline ?? "Untitled Ad"}
              </h3>
            </div>
            {(canEdit || canDelete) && !confirmDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="shrink-0 -mt-1 -mr-1.5 w-8 h-8 text-muted-foreground hover:text-foreground">
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
          </div>

          {campaign.bodyText && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {campaign.bodyText}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {dailyBudgetDollars !== null && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-primary" />${dailyBudgetDollars}/day
              </span>
            )}
            {campaign.targetingRadiusMiles != null && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />{campaign.targetingRadiusMiles} mi radius
              </span>
            )}
          </div>
        </CardContent>

        <div className="flex shrink-0 flex-col justify-center gap-3 border-t border-border/50 bg-secondary/20 p-5 sm:w-64 sm:border-t-0 sm:border-l">
          {confirmDelete ? (
            <>
              <p className="text-xs text-muted-foreground leading-snug">
                {campaign.status === "paused"
                  ? "Remove from this app? The paused campaign in Ads Manager won't be affected."
                  : "Remove this ad from the app?"}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-background" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button size="sm" variant="destructive" className="flex-1" disabled={deleteCampaign.isPending} onClick={() => deleteCampaign.mutate({ id: campaign.id })}>
                  {deleteCampaign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {statusNote && <div className={`rounded-lg border px-3 py-2 ${theme.panel}`}>{statusNote}</div>}
              {primaryAction ? (
                <div className="[&_button]:w-full [&_a]:justify-between">{primaryAction}</div>
              ) : (
                <p className="text-xs text-muted-foreground">Manage this ad from the menu.</p>
              )}
            </>
          )}
        </div>
      </div>
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
    (c) => c.status === "live" || c.status === "launching" || c.status === "paused" || c.status === "in_review",
  );

  const liveCount     = campaigns?.filter((c) => c.status === "live").length ?? 0;
  const pausedCount   = campaigns?.filter((c) => c.status === "paused").length ?? 0;
  const inReviewCount = campaigns?.filter((c) => c.status === "in_review").length ?? 0;
  const draftCount    = campaigns?.filter((c) => c.status === "draft").length ?? 0;
  const failedCount   = campaigns?.filter((c) => c.status === "error").length ?? 0;
  const totalCount    = campaigns?.length ?? 0;

  const dashboardStats = [
    { title: "Total ads", value: totalCount, icon: <BarChart3 className="w-5 h-5 text-primary" />, tone: "bg-primary/10" },
    { title: "Live", value: liveCount, icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, tone: "bg-green-500/10" },
    { title: "In review", value: inReviewCount, icon: <Clock className="w-5 h-5 text-amber-600" />, tone: "bg-amber-500/10" },
    { title: "Paused", value: pausedCount, icon: <Clock className="w-5 h-5 text-muted-foreground" />, tone: "bg-secondary" },
    { title: "Drafts", value: draftCount, icon: <FileText className="w-5 h-5 text-muted-foreground" />, tone: "bg-secondary" },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Campaigns</h1>
          <p className="mt-1 text-muted-foreground">Track your Facebook ads and lead delivery status.</p>
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
          <Button onClick={() => setLocation("/campaign/new")} size="lg" className="gap-2 shadow-md">
            <Plus className="w-4 h-4" />
            New Ad
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {dashboardStats.map((stat) => (
          <Card key={stat.title} className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-12" />
                ) : (
                  <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                )}
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${stat.tone}`}>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Facebook connection — compact and always close to the ads it controls */}
      {connection && (
        isRealAdAccountId(connection.adAccountId) ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground">
                {connection.fbPageName || "Facebook Page"}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {connection.adAccountName || connection.adAccountId}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setLocation("/connect")}
            >
              Switch account
            </button>
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            <div className="flex min-w-0 items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Ad account needs reconnecting</span>
            </div>
            <button
              type="button"
              className="shrink-0 font-medium text-amber-900 underline underline-offset-4 hover:text-amber-950"
              onClick={() => setLocation("/connect")}
            >
              Reconnect
            </button>
          </div>
        )
      )}

      {/* Content */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Campaign activity</h2>
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              <AlertTriangle className="h-3.5 w-3.5" />
              {failedCount} {failedCount === 1 ? "ad needs attention" : "ads need attention"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50 shadow-sm">
              <CardContent className="p-6">
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
        <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-semibold">Failed to load ads</p>
            <p className="text-sm text-muted-foreground">There was a problem fetching your ads.</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
        ) : !campaigns || campaigns.length === 0 ? (
        /* Empty state */
        <Card className="border-2 border-dashed border-border/70 bg-secondary/30 py-16 text-center shadow-sm">
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
          <div className="grid gap-4">
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
    </div>
  );
}
