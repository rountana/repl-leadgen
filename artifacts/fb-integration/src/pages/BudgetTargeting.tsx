import { useState } from "react";
import {
  MapPin, DollarSign, ChevronRight, Users, TrendingUp,
  Loader2, Pencil, Check, X, Info, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useGetProfile,
  useGetFbMinimumBudget,
  getGetFbMinimumBudgetQueryKey,
  type FbConnection,
} from "@workspace/api-client-react";
import { RadiusMap } from "@/components/RadiusMap";

interface BudgetTargetingProps {
  connection: FbConnection;
  initialBudget?: number;
  initialRadius?: number;
  initialAgeMin?: number;
  initialAgeMax?: number;
  initialGender?: TargetGender;
  initialInterests?: string[];
  /** Existing campaign center, retained until the user explicitly changes location. */
  initialLatitude?: number;
  initialLongitude?: number;
  onNext: (
    dailyBudget: number,
    radiusMiles: number,
    businessLocation: string,
    ageMin: number,
    ageMax: number,
    gender: TargetGender,
    interests: string[],
    targetingLatitude: number | null,
    targetingLongitude: number | null,
  ) => void;
}

type TargetGender = "all" | "male" | "female";

const BUDGET_TIPS: Record<number, string> = {
  5:  "Good for testing — low spend, small local audience. Ideal if you're just getting started.",
  10: "A solid entry budget for most local businesses. Balances reach with daily cost.",
  20: "Recommended for active campaigns — delivers a meaningful audience each day.",
  50: "High-visibility spend. Best for promotions, launches, or competitive markets.",
};

const AGE_OPTIONS = Array.from({ length: 48 }, (_, index) => index + 18);
const INTEREST_OPTIONS = [
  "Fitness and wellness",
  "Beauty",
  "Restaurants",
  "Home improvement",
  "Real estate",
  "Shopping",
  "Travel",
  "Personal finance",
  "Pets",
  "Automobiles",
  "Parenting",
  "Small business",
];

function InfoTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function BudgetTargeting({
  connection,
  initialBudget = 10,
  initialRadius = 10,
  initialAgeMin = 18,
  initialAgeMax = 65,
  initialGender = "all",
  initialInterests = [],
  initialLatitude,
  initialLongitude,
  onNext,
}: BudgetTargetingProps) {
  const [budget, setBudget] = useState(initialBudget);
  const [radius, setRadius] = useState(initialRadius);
  const [ageMin, setAgeMin] = useState(initialAgeMin);
  const [ageMax, setAgeMax] = useState(initialAgeMax);
  const [gender, setGender] = useState<TargetGender>(initialGender);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [budgetInput, setBudgetInput] = useState(String(initialBudget));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Editable target location
  const [locationOverride, setLocationOverride] = useState<string | null>(null);
  const [locationWasChanged, setLocationWasChanged] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const { data: profile, isLoading: isProfileLoading } = useGetProfile();
  const { data: minimumBudgetData, isLoading: isMinBudgetLoading } = useGetFbMinimumBudget({
    query: {
      queryKey: getGetFbMinimumBudgetQueryKey(),
      // Don't retry on 400 (no FB connection selected yet)
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const profileLocation = profile?.businessLocation ?? null;

  // Effective location: user override takes precedence over profile value
  const effectiveLocation = locationOverride ?? profileLocation;
  const hasSavedTargetCenter =
    typeof initialLatitude === "number" && typeof initialLongitude === "number";
  const usingSavedTargetCenter = hasSavedTargetCenter && !locationWasChanged;
  const locationNeedsAttention = !isProfileLoading && !effectiveLocation && !usingSavedTargetCenter;

  // Minimum daily budget in display units (dollars for USD).
  // null means the minimum couldn't be fetched — fall back to server-side validation.
  const minDailyBudgetDollars: number | null = minimumBudgetData?.minDailyBudgetDollars ?? null;
  const minFormatted: string | null = minimumBudgetData?.formatted ?? null;

  // True when the user's chosen budget is below the Meta minimum.
  const isBelowMinimum =
    minDailyBudgetDollars !== null && budget < minDailyBudgetDollars;

  const startEditLocation = () => {
    setLocationInput(effectiveLocation ?? "");
    setIsEditingLocation(true);
  };

  const saveLocation = () => {
    setLocationOverride(locationInput.trim() || null);
    setLocationWasChanged(true);
    setIsEditingLocation(false);
  };

  const cancelEditLocation = () => {
    setIsEditingLocation(false);
  };

  const handleBudgetChange = (value: string) => {
    setBudgetInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) setBudget(num);
  };

  const handleBudgetBlur = () => {
    const num = parseInt(budgetInput, 10);
    if (isNaN(num) || num < 1) {
      setBudget(1);
      setBudgetInput("1");
    } else {
      setBudget(num);
      setBudgetInput(String(num));
    }
  };

  const handleAgeMinChange = (value: string) => {
    const next = Number(value);
    setAgeMin(next);
    if (next > ageMax) setAgeMax(next);
  };

  const handleAgeMaxChange = (value: string) => {
    const next = Number(value);
    setAgeMax(next);
    if (next < ageMin) setAgeMin(next);
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : current.length < 5
          ? [...current, interest]
          : current,
    );
  };

  const estimatedReachLow  = Math.round(2000 + budget * 120 + radius * 50);
  const estimatedReachHigh = Math.round(estimatedReachLow * 2.5);

  const QUICK_BUDGETS = [5, 10, 20, 50];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Budget & Audience</h2>
          <p className="text-muted-foreground mt-1">
            Your template is ready. Confirm your daily budget and age range, or adjust the targeting details.
          </p>
        </div>

        {/* Location is only surfaced immediately when it needs to be added. */}
        {(advancedOpen || locationNeedsAttention) && (
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs text-muted-foreground">Target location</p>
                  <InfoTip content="Your ad targets people within the selected radius of this address. It's pre-filled from your profile, but you can change it for this ad without affecting your profile." />
                </div>

                {isEditingLocation ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      autoFocus
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLocation();
                        if (e.key === "Escape") cancelEditLocation();
                      }}
                      placeholder="e.g. Austin, TX"
                      className="h-8 text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-green-600 hover:text-green-700" onClick={saveLocation}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEditLocation}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : isProfileLoading ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  </div>
                ) : usingSavedTargetCenter ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div>
                      <p className="font-semibold text-sm">Original campaign location</p>
                      <p className="text-xs text-muted-foreground">Saved map center</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={startEditLocation}
                      aria-label="Change campaign target location"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                ) : effectiveLocation ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-semibold text-sm truncate">{effectiveLocation}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={startEditLocation}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-amber-700 font-medium">Not set</p>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={startEditLocation}>
                      Add location
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Daily budget */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="budget" className="text-base font-semibold">Daily Budget</Label>
              <InfoTip content="The maximum you'll spend per day running this ad. Facebook will try to spend this amount, but may spend slightly less. You can pause or cancel anytime." />
            </div>
            {isMinBudgetLoading && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking account minimum…</span>
              </div>
            )}
            {!isMinBudgetLoading && minFormatted && (
              <span className="text-xs text-muted-foreground">
                Account minimum: <span className="font-semibold text-foreground">{minFormatted}/day</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[180px]">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="budget"
                type="number"
                min={1}
                step={1}
                value={budgetInput}
                onChange={(e) => handleBudgetChange(e.target.value)}
                onBlur={handleBudgetBlur}
                className={`pl-8 text-lg font-semibold ${isBelowMinimum ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            <span className="text-muted-foreground text-sm">per day</span>
          </div>

          {/* Below-minimum warning */}
          {isBelowMinimum && minFormatted && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive font-medium">
                Your Facebook ad account requires at least {minFormatted}/day. Increase your budget to continue.
              </p>
            </div>
          )}

          {/* Quick-select buttons with tooltips */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_BUDGETS.map((amount) => {
              const belowMin = minDailyBudgetDollars !== null && amount < minDailyBudgetDollars;
              return (
                <Tooltip key={amount}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={budget === amount ? "default" : "outline"}
                      size="sm"
                      disabled={belowMin}
                      onClick={() => {
                        setBudget(amount);
                        setBudgetInput(String(amount));
                      }}
                      className={belowMin ? "opacity-40 cursor-not-allowed" : ""}
                    >
                      ${amount}/day
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-xs leading-relaxed">
                    {belowMin && minFormatted
                      ? `Below account minimum (${minFormatted}/day)`
                      : BUDGET_TIPS[amount]}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {minFormatted
              ? `Minimum ${minFormatted}/day for your account. You can pause or stop anytime.`
              : "Minimum $1/day. Some Facebook ad accounts require a higher minimum for link-click ads. You can pause or stop anytime."}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
          className="w-full rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">
                {advancedOpen ? "Hide targeting details" : "Edit targeting details"}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {usingSavedTargetCenter
                  ? "Original campaign location, radius, gender, interests, and map"
                  : "Location, radius, gender, interests, and map"}
              </span>
            </span>
            {advancedOpen
              ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </span>
        </button>

        {/* Targeting radius */}
        {advancedOpen && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-base font-semibold">Geographic Reach</Label>
              <InfoTip content="How far from your target location people can be to see your ad. A smaller radius means a more local, targeted audience. A larger radius reaches more people but may be less relevant." />
            </div>
            <span className="text-sm font-semibold text-primary">{radius} miles</span>
          </div>
          <Slider
            min={1}
            max={50}
            step={1}
            value={[radius]}
            onValueChange={([val]) => setRadius(val)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 mile</span>
            <span>25 miles</span>
            <span>50 miles</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Reach people within <span className="font-semibold text-foreground">{radius} miles</span> of {usingSavedTargetCenter ? "your original campaign location" : effectiveLocation || connection.fbPageName || "your location"}
          </p>

          {/* Radius map preview */}
          <RadiusMap
            address={usingSavedTargetCenter ? null : effectiveLocation}
            radiusMiles={radius}
            coordinates={
              usingSavedTargetCenter && initialLatitude !== undefined && initialLongitude !== undefined
                ? { lat: initialLatitude, lng: initialLongitude }
                : undefined
            }
          />
        </div>
        )}

        {/* Age and gender */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-base font-semibold">Age</Label>
            <InfoTip content="Facebook accepts a specific minimum and maximum age, so you can choose ranges like 22–46 rather than being limited to preset bands. A narrower range can make your budget more focused." />
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label="Minimum age"
              value={ageMin}
              onChange={(event) => handleAgeMinChange(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {AGE_OPTIONS.map((age) => <option key={age} value={age}>{age}</option>)}
            </select>
            <span className="text-sm text-muted-foreground">to</span>
            <select
              aria-label="Maximum age"
              value={ageMax}
              onChange={(event) => handleAgeMaxChange(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {AGE_OPTIONS.filter((age) => age >= ageMin).map((age) => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">years</span>
          </div>
          {advancedOpen && (
          <div className="flex items-center gap-3 rounded-md bg-secondary/40 px-3 py-2 text-sm">
            <Label htmlFor="gender" className="font-medium">Gender</Label>
            <select
              id="gender"
              aria-label="Gender"
              value={gender}
              onChange={(event) => setGender(event.target.value as TargetGender)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="all">Everyone</option>
              <option value="female">Women</option>
              <option value="male">Men</option>
            </select>
            <InfoTip content="Everyone is selected by default. You can narrow the audience to Men or Women if that better fits your offer." />
          </div>
          )}
        </div>

        {/* Interests */}
        {advancedOpen && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Label className="text-base font-semibold">Interests</Label>
              <InfoTip content="Pick up to five broad interests that describe what your ideal customers care about. Leave this empty to let Meta find likely customers across all interests." />
            </div>
            <span className="text-xs text-muted-foreground">{interests.length}/5 selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const selected = interests.includes(interest);
              return (
                <Button
                  key={interest}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleInterest(interest)}
                  disabled={!selected && interests.length >= 5}
                  className="text-xs"
                >
                  {interest}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional — broader targeting can help Meta find people likely to respond.
          </p>
        </div>
        )}

        {/* Estimated reach callout */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm">Estimated Daily Reach</p>
                <InfoTip content="An approximation based on your budget and radius. Actual reach depends on competition, your audience size, and ad quality. Facebook shows a more precise estimate in Ads Manager after your ad is submitted." />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {estimatedReachLow.toLocaleString()}–{estimatedReachHigh.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              people per day at ${budget}/day within {radius} miles
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>Estimates based on historical ad data. Actual results may vary.</span>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          onClick={() =>
            onNext(
              budget,
              radius,
              effectiveLocation ?? "",
              ageMin,
              ageMax,
              gender,
              interests,
              usingSavedTargetCenter ? initialLatitude ?? null : null,
              usingSavedTargetCenter ? initialLongitude ?? null : null,
            )
          }
          disabled={isProfileLoading || isBelowMinimum}
        >
          Submit for Review
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
