import { ExternalLink, Magnet, PlusCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useListLeadMagnets,
  getListLeadMagnetsQueryKey,
} from "@workspace/api-client-react";

const ADDPAGE_DASHBOARD_URL = "https://lead-magnet-hub-shaamsarath1.replit.app/dashboard";

export interface SelectedMagnet {
  id: number;
  title: string;
  shareUrl: string;
  description?: string | null;
}

interface LeadMagnetPickerProps {
  selected: SelectedMagnet | null;
  onSelect: (magnet: SelectedMagnet | null) => void;
}

export function LeadMagnetPicker({ selected, onSelect }: LeadMagnetPickerProps) {
  const { data: magnets = [], isLoading } = useListLeadMagnets({
    query: { queryKey: getListLeadMagnetsQueryKey() },
  });

  const published = magnets.filter((m) => m.status === "live" && m.shareUrl);

  const handleCreateNew = () => {
    window.open(ADDPAGE_DASHBOARD_URL, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading your lead magnets…</span>
      </div>
    );
  }

  if (published.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted mx-auto flex items-center justify-center">
          <Magnet className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No published lead magnets yet</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            A lead magnet (a free guide, checklist, or offer) gives people a reason to share
            their email. Ad clicks go straight to a signup form — so you collect real leads
            instead of just page views.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreateNew}
          className="gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Create with Addpage
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Magnet list */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
        {published.map((magnet) => {
          const isSelected = selected?.id === magnet.id;
          return (
            <button
              key={magnet.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : {
                id: magnet.id,
                title: magnet.title ?? "Lead Magnet",
                shareUrl: magnet.shareUrl!,
                description: magnet.description,
              })}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-150",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-background",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug truncate">
                    {magnet.title ?? "Untitled"}
                  </p>
                  {magnet.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {magnet.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1 truncate font-mono">
                    {magnet.shareUrl}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-green-700 border-green-300 bg-green-50">
                    Live
                  </Badge>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Create new link */}
      <button
        type="button"
        onClick={handleCreateNew}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors py-1"
      >
        <PlusCircle className="w-3 h-3" />
        Create with Addpage
        <ExternalLink className="w-3 h-3 opacity-60" />
      </button>
    </div>
  );
}
