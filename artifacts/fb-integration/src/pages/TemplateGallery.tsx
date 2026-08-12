import { useState } from "react";
import { Sparkles, ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/data/campaignTemplates";
import type { FbAdDraft } from "@workspace/api-client-react";

interface TemplateGalleryProps {
  onSelectTemplate: (draft: FbAdDraft, budget: number, radius: number) => void;
  onStartScratch: () => void;
}

export function TemplateGallery({ onSelectTemplate, onStartScratch }: TemplateGalleryProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const handleUse = (template: CampaignTemplate) => {
    onSelectTemplate(
      {
        headline: template.headline,
        bodyText: template.bodyText,
        imageUrl: template.imageUrl,
      },
      template.suggestedBudget,
      template.suggestedRadius,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          Campaign Templates
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Start with a ready-made template
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Pick a template for your industry — headline, body copy, and image are pre-filled.
          You can edit everything before launching.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CAMPAIGN_TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          const imgFailed = imgErrors.has(template.id);

          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-md",
                isSelected && "border-primary ring-2 ring-primary/20 shadow-md",
              )}
              onClick={() => setSelected(isSelected ? null : template.id)}
            >
              {/* Image */}
              <div className="relative h-36 bg-muted overflow-hidden">
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
                  /* Fallback when image fails to load */
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-5xl">{template.emoji}</span>
                  </div>
                )}
                {/* Category badge overlay */}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-black/60 text-white border-transparent text-xs backdrop-blur-sm">
                    {template.emoji} {template.category}
                  </Badge>
                </div>
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                )}
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

                {/* Use button (visible when selected) */}
                {isSelected && (
                  <Button
                    size="sm"
                    className="w-full gap-2 mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUse(template);
                    }}
                  >
                    Use This Template
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
