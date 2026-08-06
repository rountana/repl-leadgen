import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Connect" },
  { id: 2, label: "Ad Creative" },
  { id: 3, label: "Budget" },
  { id: 4, label: "Launch" },
];

interface WizardProgressProps {
  currentStep: 1 | 2 | 3 | 4;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Connector line behind steps */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />

          {STEPS.map((step, index) => {
            const isDone = step.id < currentStep;
            const isActive = step.id === currentStep;
            const isFuture = step.id > currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 z-10 relative">
                {/* Step circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200",
                    isDone && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                    isFuture && "bg-background border-border text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    (isDone || isActive) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
