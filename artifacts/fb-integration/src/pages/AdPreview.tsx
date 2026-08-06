import { useEffect } from "react";
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, RefreshCw, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { FbAdDraft, FbConnection } from "@workspace/api-client-react";
import { useGenerateFbAd } from "@workspace/api-client-react";

interface AdPreviewProps {
  connection: FbConnection;
  onNext: (adDraft: FbAdDraft) => void;
  initialDraft?: FbAdDraft | null;
}

export function AdPreview({ connection, onNext, initialDraft }: AdPreviewProps) {
  const generateAd = useGenerateFbAd();

  const adDraft = generateAd.data ?? initialDraft ?? null;

  useEffect(() => {
    if (!generateAd.data && !initialDraft) {
      generateAd.mutate({
        data: {
          businessName: connection.fbPageName ?? "My Business",
          industry: "Local Services",
          location: "your area",
          offer: "Free consultation — book yours today",
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerate = () => {
    generateAd.mutate({
      data: {
        businessName: connection.fbPageName ?? "My Business",
        industry: "Local Services",
        location: "your area",
        offer: "Free consultation — book yours today",
      },
    });
  };

  const isLoading = generateAd.isPending;
  const isError = generateAd.isError && !adDraft;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review Your Ad</h2>
        <p className="text-muted-foreground mt-1">
          We've created an ad from your business info. Regenerate until it feels right.
        </p>
      </div>

      {/* Facebook ad preview card */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            {/* FB ad header skeleton */}
            <div className="p-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="w-8 h-8 rounded" />
            </div>
            {/* Body skeleton */}
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {/* Image skeleton */}
            <Skeleton className="w-full aspect-[1.91/1]" />
            {/* CTA skeleton */}
            <div className="p-4 flex items-center justify-between border-t">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-medium mb-3">Failed to generate ad creative</p>
            <p className="text-sm text-muted-foreground mb-4">
              There was a problem connecting to the AI. Please try again.
            </p>
            <Button variant="outline" onClick={handleRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : adDraft ? (
        <Card className="overflow-hidden border-2 shadow-md">
          {/* FB post header */}
          <CardContent className="p-0">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">
                    {connection.fbPageName ?? "Your Business"}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground">Sponsored</p>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">🌐</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Body copy */}
            <div className="px-3 pb-3">
              <p className="text-sm leading-relaxed">{adDraft.bodyText}</p>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {adDraft.bodyText.length} / 90 characters
                </span>
                {adDraft.bodyText.length > 90 && (
                  <Badge variant="destructive" className="text-xs py-0">Too long</Badge>
                )}
              </div>
            </div>

            {/* Ad image */}
            <div className="w-full aspect-[1.91/1] bg-secondary/30 relative overflow-hidden">
              <img
                src={adDraft.imageUrl}
                alt="Ad creative"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            {/* Headline + CTA */}
            <div className="p-3 border-t flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">{adDraft.headline}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {adDraft.headline.length} / 40 characters
                  </span>
                  {adDraft.headline.length > 40 && (
                    <Badge variant="destructive" className="text-xs py-0">Too long</Badge>
                  )}
                </div>
              </div>
              <Button size="sm" className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" variant="ghost">
                Learn More
              </Button>
            </div>

            {/* Engagement bar */}
            <div className="px-3 py-2 border-t flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ThumbsUp className="w-4 h-4" /> Like
              </button>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="w-4 h-4" /> Comment
              </button>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
        <Button
          className="flex-1 gap-2"
          disabled={!adDraft || isLoading}
          onClick={() => adDraft && onNext(adDraft)}
        >
          Continue to Budget
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
