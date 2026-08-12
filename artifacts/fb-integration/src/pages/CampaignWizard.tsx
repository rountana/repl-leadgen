import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/WizardProgress";
import { AdPreview } from "@/pages/AdPreview";
import { BudgetTargeting } from "@/pages/BudgetTargeting";
import { LaunchConfirm } from "@/pages/LaunchConfirm";
import { TemplateGallery } from "@/pages/TemplateGallery";
import {
  useGetFbConnection,
  useGetFbCampaign,
  getGetFbConnectionQueryKey,
  type FbAdDraft,
} from "@workspace/api-client-react";

type WizardStep = 2 | 3 | 4;

interface WizardState {
  step: WizardStep;
  adDraft: FbAdDraft | null;
  dailyBudget: number;
  radiusMiles: number;
}

export function CampaignWizard() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const editId = new URLSearchParams(search).get("edit")
    ? Number(new URLSearchParams(search).get("edit"))
    : null;

  const [wizard, setWizard] = useState<WizardState>({
    step: 2,
    adDraft: null,
    dailyBudget: 10,
    radiusMiles: 10,
  });
  const [preloaded, setPreloaded] = useState(false);
  // Show template gallery for new campaigns (not in edit mode).
  // Dismissed when user picks a template or clicks "start from scratch".
  const [showTemplates, setShowTemplates] = useState(!editId);

  const { data: connection, isLoading, isError } = useGetFbConnection({
    query: { queryKey: getGetFbConnectionQueryKey(), retry: false },
  });

  // In edit mode, load existing campaign data and pre-fill the wizard
  const { data: editCampaign, isLoading: isEditLoading } = useGetFbCampaign(
    editId ?? 0,
    { query: { enabled: !!editId } },
  );

  useEffect(() => {
    if (editCampaign && !preloaded) {
      setWizard({
        step: 2,
        adDraft: editCampaign.headline
          ? {
              headline: editCampaign.headline,
              bodyText: editCampaign.bodyText ?? "",
              imageUrl: editCampaign.imageUrl ?? "",
            }
          : null,
        dailyBudget: editCampaign.dailyBudgetCents
          ? Math.round(editCampaign.dailyBudgetCents / 100)
          : 10,
        radiusMiles: editCampaign.targetingRadiusMiles ?? 10,
      });
      setPreloaded(true);
    }
  }, [editCampaign, preloaded]);

  const isConnected = connection?.status === "connected";

  if (isLoading || (editId && isEditLoading)) {
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
    if (wizard.step === 2 && !editId) {
      // Go back to template picker instead of leaving the wizard
      setShowTemplates(true);
    } else if (wizard.step === 2) {
      setLocation("/connect");
    } else {
      setWizard((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }));
    }
  };

  const handleReset = () => {
    setWizard({ step: 2, adDraft: null, dailyBudget: 10, radiusMiles: 10 });
    if (!editId) setShowTemplates(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <WizardProgress currentStep={wizard.step} />

      {/* Template gallery — shown before step 2 for new campaigns */}
      {showTemplates && wizard.step === 2 && !editId ? (
        <TemplateGallery
          onSelectTemplate={(draft, budget, radius) => {
            setWizard((prev) => ({
              ...prev,
              adDraft: draft,
              dailyBudget: budget,
              radiusMiles: radius,
            }));
            setShowTemplates(false);
          }}
          onStartScratch={() => setShowTemplates(false)}
        />
      ) : (
        <>
          {/* Back button (not shown on step 4 — no going back after launch) */}
          {wizard.step < 4 && (
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                {wizard.step === 2 && !editId ? "Templates" : "Back"}
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
              campaignId={editId ?? undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
