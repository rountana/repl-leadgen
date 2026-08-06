import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/WizardProgress";
import { AdPreview } from "@/pages/AdPreview";
import { BudgetTargeting } from "@/pages/BudgetTargeting";
import { LaunchConfirm } from "@/pages/LaunchConfirm";
import { useGetFbConnection, getGetFbConnectionQueryKey, type FbAdDraft } from "@workspace/api-client-react";

type WizardStep = 2 | 3 | 4;

interface WizardState {
  step: WizardStep;
  adDraft: FbAdDraft | null;
  dailyBudget: number;
  radiusMiles: number;
}

export function CampaignWizard() {
  const [, setLocation] = useLocation();
  const [wizard, setWizard] = useState<WizardState>({
    step: 2,
    adDraft: null,
    dailyBudget: 10,
    radiusMiles: 10,
  });

  const { data: connection, isLoading, isError } = useGetFbConnection({
    query: { queryKey: getGetFbConnectionQueryKey(), retry: false },
  });

  const isConnected = connection?.status === "connected";

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <WizardProgress currentStep={wizard.step} />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <WizardProgress currentStep={2} />
        <div className="mt-8 p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <div>
            <p className="font-semibold">Facebook account not connected</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need to connect your Facebook account before creating a campaign.
            </p>
          </div>
          <Button onClick={() => setLocation("/connect")}>Go to Connect</Button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (wizard.step === 2) {
      setLocation("/connect");
    } else {
      setWizard((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }));
    }
  };

  const handleReset = () => {
    setWizard({ step: 2, adDraft: null, dailyBudget: 10, radiusMiles: 10 });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <WizardProgress currentStep={wizard.step} />

      {/* Back button (not shown on step 4 — no going back after launch) */}
      {wizard.step < 4 && (
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      )}

      {wizard.step === 2 && (
        <AdPreview
          connection={connection}
          initialDraft={wizard.adDraft}
          onNext={(adDraft) =>
            setWizard((prev) => ({ ...prev, step: 3, adDraft }))
          }
        />
      )}

      {wizard.step === 3 && (
        <BudgetTargeting
          connection={connection}
          initialBudget={wizard.dailyBudget}
          initialRadius={wizard.radiusMiles}
          onNext={(dailyBudget, radiusMiles) =>
            setWizard((prev) => ({ ...prev, step: 4, dailyBudget, radiusMiles }))
          }
        />
      )}

      {wizard.step === 4 && wizard.adDraft && (
        <LaunchConfirm
          adDraft={wizard.adDraft}
          dailyBudget={wizard.dailyBudget}
          radiusMiles={wizard.radiusMiles}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
