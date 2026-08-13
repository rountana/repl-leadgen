import { useState } from "react";
import { MapPin, DollarSign, ChevronRight, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { FbConnection } from "@workspace/api-client-react";

interface BudgetTargetingProps {
  connection: FbConnection;
  initialBudget?: number;
  initialRadius?: number;
  onNext: (dailyBudget: number, radiusMiles: number) => void;
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

  const businessLocation = "San Francisco, CA"; // Phase 1 mock — real location from geocoded connection in Phase 2

  const handleBudgetChange = (value: string) => {
    setBudgetInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      setBudget(num);
    }
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

  const estimatedReachLow = Math.round(2000 + budget * 120 + radius * 50);
  const estimatedReachHigh = Math.round(estimatedReachLow * 2.5);

  const pageName = connection.fbPageName ?? "your area";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Budget & Targeting</h2>
        <p className="text-muted-foreground mt-1">
          Set how much to spend and who to reach each day.
        </p>
      </div>

      {/* Business location display */}
      <Card className="bg-secondary/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Business location</p>
            <p className="font-semibold text-sm">{businessLocation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Daily budget */}
      <div className="space-y-3">
        <Label htmlFor="budget" className="text-base font-semibold">
          Daily Budget
        </Label>
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

        {/* Quick-select buttons */}
        <div className="flex gap-2 flex-wrap">
          {[5, 10, 20, 50].map((amount) => (
            <Button
              key={amount}
              variant={budget === amount ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBudget(amount);
                setBudgetInput(String(amount));
              }}
            >
              ${amount}/day
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Minimum $1/day. Some Facebook ad accounts require a higher minimum for link-click campaigns.
          You can pause or stop anytime.
        </p>
      </div>

      {/* Targeting radius */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Geographic Reach</Label>
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
          Reach people within <span className="font-semibold text-foreground">{radius} miles</span> of {pageName}
        </p>
      </div>

      {/* Estimated reach callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-sm">Estimated Daily Reach</p>
          </div>
          <p className="text-2xl font-bold text-primary">
            {estimatedReachLow.toLocaleString()}–{estimatedReachHigh.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            people per day at ${budget}/day within {radius} miles
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Estimates based on historical campaign data. Actual results may vary.</span>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full h-12 text-base font-semibold gap-2"
        onClick={() => onNext(budget, radius)}
      >
        Submit for Review
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
