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
  MoreHorizontal,
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

function StatusBadge({ status }: { status: FbCampaignStatus }) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Live
        </Badge>
      );
    case "launching":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 gap-1">
          <Clock className="w-3 h-3" /> Launching
        </Badge>
      );
    case "paused":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 gap-1">
          <FileText className="w-3 h-3" /> Draft
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 gap-1">
          <AlertTriangle className="w-3 h-3" /> Launch failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <FileText className="w-3 h-3" /> Draft
        </Badge>
      );
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

  return (
    <Card className="overflow-hidden hover:border-primary/40 transition-colors">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Main content */}
          <div className="p-5 flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={campaign.status} />
              {campaign.status === "live" && (
                <LeadDeliveryPill status={campaign.leadDeliveryStatus} />
              )}
            </div>

            <div>
              <h3 className="font-bold text-base leading-tight">
                {campaign.headline ?? "Untitled Ad"}
              </h3>
              {campaign.bodyText && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {campaign.bodyText}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {dailyBudgetDollars !== null && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  ${dailyBudgetDollars}/day
                </span>
              )}
              {campaign.targetingRadiusMiles !== null && campaign.targetingRadiusMiles !== undefined && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {campaign.targetingRadiusMiles} mi radius
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-secondary/20 p-5 sm:w-52 flex flex-col justify-center gap-2 border-t sm:border-t-0 sm:border-l border-border/50">
            {campaign.status === "live" ? (
              <>
                <Button variant="outline" size="sm" className="w-full gap-2 bg-background" asChild>
                  <a
                    href={adsManagerUrl(adAccountId, sharedCampaignId ?? campaign.partnerCampaignId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View in Ads Manager
                  </a>
                </Button>
                <Button size="sm" variant="ghost" className="w-full gap-2 text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  View Details
                </Button>
              </>
            ) : campaign.status === "launching" ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Under review by Facebook</p>
                <p className="text-xs text-muted-foreground mt-1">Usually live within minutes</p>
              </div>
            ) : campaign.status === "paused" ? (
              <>
                <p className="text-xs text-amber-700 font-medium text-center leading-snug">
                  Ready to go live
                </p>
                <Button variant="outline" size="sm" className="w-full gap-2 bg-background" asChild>
                  <a
                    href={adsManagerUrl(adAccountId, sharedCampaignId ?? campaign.partnerCampaignId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Activate in Ads Manager
                  </a>
                </Button>
                {confirmDelete ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-center text-muted-foreground leading-snug">
                      Remove from this app? The paused campaign in Ads Manager won't be affected.
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7 bg-background" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                      <Button size="sm" variant="destructive" className="flex-1 text-xs h-7" disabled={deleteCampaign.isPending} onClick={() => deleteCampaign.mutate({ id: campaign.id })}>
                        {deleteCampaign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="w-full gap-1.5 text-xs text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/campaign/new?edit=${campaign.id}`)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            ) : campaign.status === "error" ? (
              <div className="space-y-2">
                {campaign.errorMessage && (
                  <p className="text-xs text-muted-foreground break-words leading-relaxed text-center">
                    {campaign.errorMessage.length > 120
                      ? campaign.errorMessage.slice(0, 120) + "…"
                      : campaign.errorMessage}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 bg-background text-xs"
                  disabled={launch.isPending}
                  onClick={() => launch.mutate({ id: campaign.id })}
                >
                  {launch.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />Retrying…</>
                  ) : (
                    <><RefreshCw className="w-3 h-3" />Retry</>
                  )}
                </Button>
                {confirmDelete ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-center text-muted-foreground leading-snug">
                      Remove this failed ad from the app?
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7 bg-background" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                      <Button size="sm" variant="destructive" className="flex-1 text-xs h-7" disabled={deleteCampaign.isPending} onClick={() => deleteCampaign.mutate({ id: campaign.id })}>
                        {deleteCampaign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="w-full gap-1.5 text-xs text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/campaign/new?edit=${campaign.id}`)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Draft</p>
                {confirmDelete ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-center text-muted-foreground leading-snug">
                      Remove this draft from the app?
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7 bg-background" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                      <Button size="sm" variant="destructive" className="flex-1 text-xs h-7" disabled={deleteCampaign.isPending} onClick={() => deleteCampaign.mutate({ id: campaign.id })}>
                        {deleteCampaign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Draft
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
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
