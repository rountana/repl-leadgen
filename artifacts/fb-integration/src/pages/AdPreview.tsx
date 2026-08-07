import { useState, useRef, useEffect } from "react";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Sparkles,
  Upload,
  X,
  ChevronRight,
  User,
  ImageIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { FbAdDraft, FbConnection } from "@workspace/api-client-react";
import {
  useGenerateFbAd,
  useListIndustries,
  getListIndustriesQueryKey,
} from "@workspace/api-client-react";

interface AdPreviewProps {
  connection: FbConnection;
  onNext: (adDraft: FbAdDraft) => void;
  initialDraft?: FbAdDraft | null;
}

const HEADLINE_LIMIT = 40;
const BODY_LIMIT = 90;

export function AdPreview({ connection, onNext, initialDraft }: AdPreviewProps) {
  // ── Business info state ────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState(connection.fbPageName ?? "");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [infoOpen, setInfoOpen] = useState(!initialDraft);

  // ── Ad copy state ──────────────────────────────────────────────────────
  const [headline, setHeadline] = useState(initialDraft?.headline ?? "");
  const [bodyText, setBodyText] = useState(initialDraft?.bodyText ?? "");
  const [imageUrl, setImageUrl] = useState(initialDraft?.imageUrl ?? "");

  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: industries = [] } = useListIndustries({
    query: { queryKey: getListIndustriesQueryKey() },
  });

  const generateAd = useGenerateFbAd({
    mutation: {
      onSuccess: (draft) => {
        setHeadline(draft.headline);
        setBodyText(draft.bodyText);
        if (draft.imageUrl) setImageUrl(draft.imageUrl);
        setInfoOpen(false);
      },
    },
  });

  // Sync back if parent passes a draft after mount
  useEffect(() => {
    if (initialDraft && !headline && !bodyText) {
      setHeadline(initialDraft.headline);
      setBodyText(initialDraft.bodyText);
      setImageUrl(initialDraft.imageUrl ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!businessName.trim()) return;
    generateAd.mutate({
      data: {
        businessName: businessName.trim(),
        industry: industry || "Local Services",
        location: location.trim() || "your area",
        offer: offer.trim() || "Contact us today",
      },
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const canContinue = headline.trim().length > 0 && bodyText.trim().length > 0;

  const draft: FbAdDraft = { headline, bodyText, imageUrl };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Build Your Ad</h2>
        <p className="text-muted-foreground mt-1">
          Fill in your business details, generate copy with AI, then tweak to perfection.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT: Editor ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Business info accordion */}
          <Card>
            <CardHeader
              className="py-3 px-4 cursor-pointer select-none"
              onClick={() => setInfoOpen((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  About Your Business
                </CardTitle>
                {infoOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CardHeader>

            {infoOpen && (
              <CardContent className="pt-0 pb-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bizName" className="text-xs">Business name</Label>
                  <Input
                    id="bizName"
                    placeholder="e.g. Acme HVAC"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="industry" className="text-xs">Industry</Label>
                    <div className="relative">
                      <select
                        id="industry"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {industries.map((ind) => (
                          <option key={ind.id} value={ind.name}>{ind.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs">City / area</Label>
                    <Input
                      id="location"
                      placeholder="e.g. Austin, TX"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="offer" className="text-xs">
                    What's your offer or hook?
                  </Label>
                  <Input
                    id="offer"
                    placeholder="e.g. Free estimate — book yours today"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A special deal, free consultation, limited offer, etc.
                  </p>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleGenerate}
                  disabled={!businessName.trim() || generateAd.isPending}
                >
                  {generateAd.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate with AI</>
                  )}
                </Button>

                {generateAd.isError && (
                  <p className="text-xs text-destructive text-center">
                    Generation failed — you can still write your copy below.
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Headline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="headline" className="font-semibold">Headline</Label>
              <span className={`text-xs tabular-nums ${headline.length > HEADLINE_LIMIT ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {headline.length}/{HEADLINE_LIMIT}
              </span>
            </div>
            <Input
              id="headline"
              placeholder="e.g. Save on Your AC This Summer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className={headline.length > HEADLINE_LIMIT ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {headline.length > HEADLINE_LIMIT && (
              <p className="text-xs text-destructive">Trim to {HEADLINE_LIMIT} characters — Facebook truncates longer headlines.</p>
            )}
          </div>

          {/* Body text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="body" className="font-semibold">Body copy</Label>
              <span className={`text-xs tabular-nums ${bodyText.length > BODY_LIMIT ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {bodyText.length}/{BODY_LIMIT}
              </span>
            </div>
            <Textarea
              id="body"
              rows={3}
              placeholder="e.g. Beat the heat without breaking the bank. Our certified techs service all major brands — fast, reliable, and fully insured."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className={bodyText.length > BODY_LIMIT ? "border-destructive focus-visible:ring-destructive resize-none" : "resize-none"}
            />
            {bodyText.length > BODY_LIMIT && (
              <p className="text-xs text-destructive">Trim to {BODY_LIMIT} characters for best delivery.</p>
            )}
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label className="font-semibold">Ad image</Label>
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border aspect-[1.91/1] bg-secondary/30">
                <img
                  src={imageUrl}
                  alt="Ad creative"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded-md hover:bg-black/80 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full aspect-[1.91/1] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Upload image</p>
                  <p className="text-xs text-muted-foreground">1.91:1 ratio works best (e.g. 1200×628px)</p>
                </div>
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Continue */}
          <Button
            className="w-full h-11 text-base font-semibold gap-2"
            disabled={!canContinue}
            onClick={() => onNext(draft)}
          >
            Continue to Budget & Targeting
            <ChevronRight className="w-5 h-5" />
          </Button>

          {!canContinue && (
            <p className="text-xs text-center text-muted-foreground">
              Add a headline and body copy to continue.
            </p>
          )}
        </div>

        {/* ── RIGHT: Live preview ───────────────────────────────────────── */}
        <div className="space-y-3 lg:sticky lg:top-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Preview
          </p>
          <Card className="overflow-hidden border-2 shadow-md">
            <CardContent className="p-0">
              {/* FB post header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">
                      {businessName || connection.fbPageName || "Your Business"}
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">Sponsored</p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">🌐</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="w-7 h-7" tabIndex={-1}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* Body copy */}
              <div className="px-3 pb-3">
                {bodyText ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {bodyText}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Your ad copy will appear here…
                  </p>
                )}
              </div>

              {/* Image */}
              <div className="w-full aspect-[1.91/1] bg-secondary/40 relative overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Ad creative"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                    <p className="text-xs">Image will appear here</p>
                  </div>
                )}
              </div>

              {/* Headline + CTA */}
              <div className="p-3 border-t flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {headline ? (
                    <>
                      <p className="font-bold text-sm leading-tight truncate">{headline}</p>
                      {headline.length > HEADLINE_LIMIT && (
                        <Badge variant="destructive" className="text-xs py-0 mt-0.5">Too long</Badge>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Headline…</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border border-[#1877F2]/20"
                  variant="ghost"
                  tabIndex={-1}
                >
                  Learn More
                </Button>
              </div>

              {/* Engagement bar */}
              <div className="px-3 py-2 border-t flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3.5 h-3.5" /> Like
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5" /> Comment
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            This is an approximation of how your ad will look on Facebook.
          </p>
        </div>
      </div>
    </div>
  );
}
