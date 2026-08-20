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
  Magnet,
  Link2,
  BookmarkPlus,
  Check,
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
  useGetProfile,
  useCreateFbAdTemplate,
  getListIndustriesQueryKey,
  getGetProfileQueryKey,
  getListFbAdTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LeadMagnetPicker, type SelectedMagnet } from "@/components/LeadMagnetPicker";

interface AdPreviewProps {
  connection: FbConnection;
  onNext: (adDraft: FbAdDraft, destinationUrl: string) => void;
  initialDraft?: FbAdDraft | null;
  initialDestinationUrl?: string;
}

const HEADLINE_LIMIT = 40;
const BODY_LIMIT = 90;
const DEFAULT_CALL_TO_ACTION = "LEARN_MORE" as const;

type CallToAction = NonNullable<FbAdDraft["callToAction"]>;

const CALL_TO_ACTION_OPTIONS: Array<{ value: CallToAction; label: string; description: string }> = [
  { value: "LEARN_MORE", label: "Learn More", description: "Tell people more about your offer" },
  { value: "GET_OFFER", label: "Get Offer", description: "Highlight a promotion or deal" },
  { value: "DOWNLOAD", label: "Download", description: "Share a guide, checklist, or file" },
  { value: "SIGN_UP", label: "Sign Up", description: "Invite people to register or join" },
  { value: "CONTACT_US", label: "Contact Us", description: "Encourage prospective customers to reach out" },
  { value: "BOOK_NOW", label: "Book Now", description: "Prompt people to schedule a service" },
];

export function AdPreview({ connection, onNext, initialDraft, initialDestinationUrl }: AdPreviewProps) {
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
  const [callToAction, setCallToAction] = useState<CallToAction>(
    initialDraft?.callToAction ?? DEFAULT_CALL_TO_ACTION,
  );
  // A selected template is already a complete starting point. Keep the detailed
  // controls out of the way unless the user needs to change something.
  const [detailsOpen, setDetailsOpen] = useState(!initialDraft || !initialDraft.bodyText);

  // ── Lead magnet destination state ──────────────────────────────────────
  const [destinationUrl, setDestinationUrl] = useState(initialDestinationUrl ?? "");
  const [selectedMagnet, setSelectedMagnet] = useState<SelectedMagnet | null>(null);
  const destinationHydrated = useRef(false);
  // Keep this visible for new campaigns so the HVCG lead-magnet flow is easy to discover.
  const [magnetOpen, setMagnetOpen] = useState(true);

  // ── Save-as-template state ─────────────────────────────────────────────
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);

  const queryClient = useQueryClient();
  const createTemplate = useCreateFbAdTemplate();

  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: industries = [] } = useListIndustries({
    query: { queryKey: getListIndustriesQueryKey() },
  });

  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), staleTime: 60_000 },
  });

  // Apply profile data once on first load (profile wins over FB page name fallback)
  const profileApplied = useRef(false);
  useEffect(() => {
    if (!profile || profileApplied.current) return;
    profileApplied.current = true;
    if (profile.businessName) setBusinessName(profile.businessName);
    if (profile.industry) setIndustry(profile.industry);
    if (profile.businessLocation) setLocation(profile.businessLocation);
  }, [profile]);

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

  // Edit campaigns can load just after this component mounts. Hydrate the empty
  // local editor once the parent receives that saved draft, without overwriting
  // a user's in-progress changes.
  useEffect(() => {
    if (!initialDraft || headline || bodyText) return;
    setHeadline(initialDraft.headline);
    setBodyText(initialDraft.bodyText);
    setImageUrl(initialDraft.imageUrl ?? "");
    setCallToAction(initialDraft.callToAction ?? DEFAULT_CALL_TO_ACTION);
    setDetailsOpen(false);
  }, [initialDraft, headline, bodyText]);

  useEffect(() => {
    if (!initialDraft || destinationHydrated.current) return;
    setDestinationUrl(initialDestinationUrl ?? "");
    destinationHydrated.current = true;
  }, [initialDraft, initialDestinationUrl]);

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

  const handleMagnetSelect = (magnet: SelectedMagnet | null) => {
    setSelectedMagnet(magnet);
    setDestinationUrl(magnet?.shareUrl ?? "");
    // Auto-close the picker after selecting
    if (magnet) setMagnetOpen(false);
  };

  const canContinue = headline.trim().length > 0 && bodyText.trim().length > 0;

  const draft: FbAdDraft = { headline, bodyText, imageUrl, callToAction };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {initialDraft ? "Your ad is ready to review" : "Build Your Ad"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {initialDraft
            ? "Your selected template is ready. Review the headline, then make only the changes you need."
            : "Add the essential details below, then review how your ad will look."}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT: Editor ─────────────────────────────────────────────── */}
        <div className="order-last space-y-4 lg:order-first">

          {/* The headline is the only creative field surfaced in the fast path. */}
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

          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
            className="w-full rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">
                  {detailsOpen ? "Hide ad details" : "Edit ad details"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Copy, image, button, destination, and AI tools
                </span>
              </span>
              {detailsOpen
                ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </span>
          </button>

          {detailsOpen && (
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

          {/* Call to action */}
          <div className="space-y-2">
            <div>
              <Label id="call-to-action-label" className="font-semibold">
                Call-to-action button
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Facebook will show this button below your ad.
              </p>
            </div>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-labelledby="call-to-action-label"
            >
              {CALL_TO_ACTION_OPTIONS.map((option) => {
                const selected = callToAction === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCallToAction(option.value)}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background hover:border-primary/40 hover:bg-secondary/40"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
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

          {/* ── Lead Magnet Destination ──────────────────────────────────── */}
          <Card className={destinationUrl ? "border-primary/30 bg-primary/5" : ""}>
            <CardHeader
              className="py-3 px-4 cursor-pointer select-none"
              onClick={() => setMagnetOpen((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Magnet className="w-3.5 h-3.5 text-primary" />
                  <CardTitle className="text-sm font-semibold">
                    Link a Lead Magnet
                  </CardTitle>
                  {destinationUrl ? (
                    <Badge className="text-[10px] py-0 px-1.5 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                      Linked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                      Optional
                    </Badge>
                  )}
                </div>
                {magnetOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {/* Show linked URL when collapsed */}
              {!magnetOpen && destinationUrl && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Link2 className="w-3 h-3 text-primary shrink-0" />
                  <p className="text-xs text-primary truncate font-medium">{destinationUrl}</p>
                </div>
              )}
              {!magnetOpen && !destinationUrl && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recommended — ads with a lead magnet collect real contact info instead of just sending people to your Facebook Page.
                </p>
              )}
            </CardHeader>

            {magnetOpen && (
              <CardContent className="pt-0 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When someone clicks your ad, they land on your lead magnet — a free guide, checklist,
                  or offer — and enter their email to receive it. <span className="text-foreground font-medium">You get a real lead</span>, not just
                  a page visit. Ads linked to lead magnets typically convert far better than ads that
                  send people to a Facebook Page.
                </p>
                <LeadMagnetPicker
                  selected={selectedMagnet}
                  onSelect={handleMagnetSelect}
                />
                {/* Manual URL override */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <Label htmlFor="destUrl" className="text-xs text-muted-foreground">
                     Already have a webpage? Paste its link here
                  </Label>
                  <Input
                    id="destUrl"
                    type="url"
                    placeholder="https://your-landing-page.com"
                    value={destinationUrl}
                    onChange={(e) => {
                      setDestinationUrl(e.target.value);
                      if (e.target.value !== selectedMagnet?.shareUrl) {
                        setSelectedMagnet(null);
                      }
                    }}
                    className="text-xs h-8"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Save as personal template */}
          {canContinue && (
            <div className="border border-border rounded-lg overflow-hidden">
              {!templatePanelOpen ? (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                  onClick={() => {
                    setTemplatePanelOpen(true);
                    setTemplateName(headline.slice(0, 60));
                    setTemplateSaved(false);
                  }}
                >
                  <BookmarkPlus className="w-4 h-4 shrink-0" />
                  Save as personal template
                </button>
              ) : templateSaved ? (
                <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 bg-green-50">
                  <Check className="w-4 h-4 shrink-0" />
                  Template saved — it'll appear in your gallery next time.
                </div>
              ) : (
                <div className="p-3 space-y-2 bg-secondary/20">
                  <p className="text-xs font-medium text-muted-foreground">Name this template</p>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      maxLength={60}
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Summer promo copy"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setTemplatePanelOpen(false);
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={!templateName.trim() || createTemplate.isPending}
                      onClick={async () => {
                        await createTemplate.mutateAsync({
                          data: {
                            name: templateName.trim(),
                            headline,
                            bodyText,
                            imageUrl,
                          },
                        });
                        await queryClient.invalidateQueries({ queryKey: getListFbAdTemplatesQueryKey() });
                        setTemplateSaved(true);
                      }}
                    >
                      {createTemplate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTemplatePanelOpen(false)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          )}

          {/* Continue */}
          <Button
            className="w-full h-11 text-base font-semibold gap-2"
            disabled={!canContinue}
            onClick={() => onNext(draft, destinationUrl)}
          >
            Review Budget & Audience
            <ChevronRight className="w-5 h-5" />
          </Button>

          {!canContinue && (
            <p className="text-xs text-center text-muted-foreground">
              Expand ad details to add body copy before continuing.
            </p>
          )}
        </div>

        {/* ── RIGHT: Live preview ───────────────────────────────────────── */}
        <div className="order-first space-y-3 lg:sticky lg:top-6 lg:order-last lg:justify-self-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Preview
          </p>
          <Card className="w-full max-w-[400px] overflow-hidden border shadow-md">
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
                  {/* Destination URL chip in preview */}
                  {destinationUrl && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {destinationUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border border-[#1877F2]/20"
                  variant="ghost"
                  tabIndex={-1}
                >
                  {CALL_TO_ACTION_OPTIONS.find((option) => option.value === callToAction)?.label ?? "Learn More"}
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
          <p className="text-xs text-muted-foreground text-center">
            Ads currently target Facebook. Instagram and other placements are in the works.
          </p>
        </div>
      </div>
    </div>
  );
}
