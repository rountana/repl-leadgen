import { useState } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowRight, PenLine, Star, Trash2, BookmarkCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/data/campaignTemplates";
import {
  useGetProfile,
  useListIndustries,
  useListFbAdTemplates,
  useDeleteFbAdTemplate,
  getGetProfileQueryKey,
  getListIndustriesQueryKey,
  getListFbAdTemplatesQueryKey,
  type FbAdDraft,
  type FbAdTemplate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface TemplateGalleryProps {
  onSelectTemplate: (draft: FbAdDraft, budget: number, radius: number) => void;
  onStartScratch: () => void;
}

export function TemplateGallery({ onSelectTemplate, onStartScratch }: TemplateGalleryProps) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Detect user's industry so we can surface the matching template first
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { data: industries = [] } = useListIndustries({ query: { queryKey: getListIndustriesQueryKey() } });
  const { data: myTemplates = [] } = useListFbAdTemplates({ query: { queryKey: getListFbAdTemplatesQueryKey() } });
  const deleteTemplate = useDeleteFbAdTemplate();
  const queryClient = useQueryClient();

  const userSlug = industries.find((i) => i.name === profile?.industry)?.slug ?? null;

  // Partition: matching templates float to the top, rest follow
  const recommended = userSlug
    ? CAMPAIGN_TEMPLATES.filter((t) => t.industrySlug === userSlug)
    : [];
  const others = userSlug
    ? CAMPAIGN_TEMPLATES.filter((t) => t.industrySlug !== userSlug)
    : CAMPAIGN_TEMPLATES;

  const handleUse = (template: CampaignTemplate) => {
    onSelectTemplate(
      {
        headline: template.headline,
        bodyText: template.bodyText,
        imageUrl: template.imageUrl,
        callToAction: "LEARN_MORE",
      },
      template.suggestedBudget,
      template.suggestedRadius,
    );
  };

  const renderCard = (template: CampaignTemplate, isRecommended = false) => {
    const imgFailed = imgErrors.has(template.id);

    return (
      <Card
        key={template.id}
        className={cn(
          "w-full max-w-[420px] cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-md",
          isRecommended && "border-primary/30",
        )}
      >
        {/* Image */}
          <div className="relative aspect-[1.91/1] bg-muted overflow-hidden">
          {!imgFailed ? (
            <img
              src={template.imageUrl}
              alt={template.category}
              className="w-full h-full object-cover"
              onError={() =>
                setImgErrors((prev) => new Set([...prev, template.id]))
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-5xl">{template.emoji}</span>
            </div>
          )}
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <Badge className="bg-black/60 text-white border-transparent text-xs backdrop-blur-sm">
              {template.emoji} {template.category}
            </Badge>
            {isRecommended && (
              <Badge className="bg-primary text-primary-foreground border-transparent text-xs gap-1">
                <Star className="w-2.5 h-2.5" /> For you
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Copy preview */}
          <div>
            <p className="font-semibold text-sm leading-snug">{template.headline}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.bodyText}</p>
          </div>

          {/* Suggestions */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>${template.suggestedBudget}/day</span>
            <span>·</span>
            <span>{template.suggestedRadius} mi radius</span>
          </div>

          <Button size="sm" className="w-full gap-2 mt-1" onClick={() => handleUse(template)}>
            Use This Template
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  const handleDeleteMyTemplate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTemplate.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: getListFbAdTemplatesQueryKey() });
  };

  const renderMyTemplateCard = (template: FbAdTemplate) => {
    return (
      <Card
        key={template.id}
        className={cn(
          "w-full max-w-[420px] cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-md",
        )}
      >
        {/* Image */}
        <div className="relative aspect-[1.91/1] bg-muted overflow-hidden">
          {template.imageUrl ? (
            <img src={template.imageUrl} alt={template.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <BookmarkCheck className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className="bg-black/60 text-white border-transparent text-xs backdrop-blur-sm gap-1">
              <BookmarkCheck className="w-2.5 h-2.5" /> Saved
            </Badge>
          </div>
          <button
            type="button"
            onClick={(e) => handleDeleteMyTemplate(template.id, e)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
            title="Delete template"
            aria-label={`Delete ${template.name} template`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="font-semibold text-sm leading-snug">{template.name}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.headline}</p>
          </div>
          <Button
            size="sm"
            className="w-full gap-2 mt-1"
            onClick={() =>
              onSelectTemplate(
                {
                  headline: template.headline,
                  bodyText: template.bodyText,
                  imageUrl: template.imageUrl,
                  callToAction: "LEARN_MORE",
                },
                template.suggestedDailyBudget ?? 10,
                template.suggestedRadiusMiles ?? 10,
              )
            }
          >
            Use This Template
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          Ad Templates
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Start with a ready-made template
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Pick a template for your industry and preview a ready-to-submit ad. You can make changes whenever you want.
        </p>
      </div>

      {/* Industry nudge — shown only when profile is loaded but industry is unset */}
      {profile && !profile.industry && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <Briefcase className="w-4 h-4 shrink-0 text-amber-600" />
          <p className="flex-1">
            Set your industry in your profile to get personalised template recommendations.
          </p>
          <Link href="/profile?returnTo=/campaign/new">
            <span className="whitespace-nowrap font-medium underline underline-offset-2 hover:text-amber-700 transition-colors cursor-pointer">
              Set industry
            </span>
          </Link>
        </div>
      )}

      {/* My templates section */}
      {myTemplates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            My saved templates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 justify-items-center gap-4">
            {myTemplates.map((t) => renderMyTemplateCard(t))}
          </div>
        </div>
      )}

      {/* Recommended section (only shown when we have a match) */}
      {recommended.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recommended for your industry
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 justify-items-center gap-4">
            {recommended.map((t) => renderCard(t, true))}
          </div>
        </div>
      )}

      {/* All (or remaining) templates */}
      {others.length > 0 && (
        <div className="space-y-3">
          {recommended.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Other templates
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 justify-items-center gap-4">
            {others.map((t) => renderCard(t, false))}
          </div>
        </div>
      )}

      {/* Attribution note */}
      <p className="text-center text-xs text-muted-foreground">
        Stock photos provided by{" "}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Unsplash
        </a>
        . You can replace any image in the next step.
      </p>

      {/* Start from scratch */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={onStartScratch}
        >
          <PenLine className="w-4 h-4" />
          Start from scratch instead
        </Button>
      </div>
    </div>
  );
}
