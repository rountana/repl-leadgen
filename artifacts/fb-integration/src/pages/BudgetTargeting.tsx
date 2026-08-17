import { useState } from "react";
import {
  MapPin, DollarSign, ChevronRight, Users, TrendingUp,
  Loader2, Pencil, Check, X, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetProfile, type FbConnection } from "@workspace/api-client-react";

interface BudgetTargetingProps {
  connection: FbConnection;
  initialBudget?: number;
  initialRadius?: number;
  onNext: (dailyBudget: number, radiusMiles: number, businessLocation: string) => void;
}

const BUDGET_TIPS: Record<number, string> = {
  5:  "Good for testing — low spend, small local audience. Ideal if you're just getting started.",
  10: "A solid entry budget for most local businesses. Balances reach with daily cost.",
  20: "Recommended for active campaigns — delivers a meaningful audience each day.",
  50: "High-visibility spend. Best for promotions, launches, or competitive markets.",
};

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
  onNext,
}: BudgetTargetingProps) {
  const [budget, setBudget] = useState(initialBudget);
  const [radius, setRadius] = useState(initialRadius);
  const [budgetInput, setBudgetInput] = useState(String(initialBudget));

  // Editable target location
  const [locationOverride, setLocationOverride] = useState<string | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const { data: profile, isLoading: isProfileLoading } = useGetProfile();
  const profileLocation = profile?.businessLocation ?? null;

  // Effective location: user override takes precedence over profile value
  const effectiveLocation = locationOverride ?? profileLocation;

  const startEditLocation = () => {
    setLocationInput(effectiveLocation ?? "");
    setIsEditingLocation(true);
  };

  const saveLocation = () => {
    setLocationOverride(locationInput.trim() || null);
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

  const estimatedReachLow  = Math.round(2000 + budget * 120 + radius * 50);
  const estimatedReachHigh = Math.round(estimatedReachLow * 2.5);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget & Targeting</h2>
          <p className="text-muted-foreground mt-1">
            Set how much to spend and who to reach each day.
          </p>
        </div>

        {/* Target location */}
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

        {/* Daily budget */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="budget" className="text-base font-semibold">Daily Budget</Label>
            <InfoTip content="The maximum you'll spend per day running this ad. Facebook will try to spend this amount, but may spend slightly less. You can pause or cancel anytime." />
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
                className="pl-8 text-lg font-semibold"
              />
            </div>
            <span className="text-muted-foreground text-sm">per day</span>
          </div>

          {/* Quick-select buttons with tooltips */}
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 20, 50].map((amount) => (
              <Tooltip key={amount}>
                <TooltipTrigger asChild>
                  <Button
                    variant={budget === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBudget(amount);
                      setBudgetInput(String(amount));
                    }}
                  >
                    ${amount}/day
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-xs leading-relaxed">
                  {BUDGET_TIPS[amount]}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Minimum $1/day. Some Facebook ad accounts require a higher minimum for link-click ads.
            You can pause or stop anytime.
          </p>
        </div>

        {/* Targeting radius */}
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
            Reach people within <span className="font-semibold text-foreground">{radius} miles</span> of {effectiveLocation || connection.fbPageName || "your location"}
          </p>
        </div>

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
          onClick={() => onNext(budget, radius, effectiveLocation ?? "")}
          disabled={isProfileLoading}
        >
          Submit for Review
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
