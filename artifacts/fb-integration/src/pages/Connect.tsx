import { useState } from "react";
import { useLocation } from "wouter";
import {
  Facebook,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Monitor,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WizardProgress } from "@/components/WizardProgress";
import {
  useGetFbConnection,
  useCreateFbConnection,
  useDeleteFbConnection,
  getGetFbConnectionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function Connect() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useGetFbConnection({
    query: { queryKey: getGetFbConnectionQueryKey(), retry: false },
  });
  const createConnection = useCreateFbConnection();
  const deleteConnection = useDeleteFbConnection();

  const isConnected = connection?.status === "connected";

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState({ fbPageId: "", fbPageName: "", adAccountId: "", adAccountName: "" });

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setFormError(null);
    if (!fields.fbPageId.trim()) { setFormError("Facebook Page ID is required."); return; }
    if (!fields.adAccountId.trim()) { setFormError("Ad Account ID is required."); return; }
    if (!fields.adAccountId.startsWith("act_")) {
      setFormError("Ad Account ID must start with act_ — copy it exactly from Facebook Business Settings.");
      return;
    }
    try {
      await createConnection.mutateAsync({ data: {
        fbPageId: fields.fbPageId.trim(),
        fbPageName: fields.fbPageName.trim() || undefined,
        adAccountId: fields.adAccountId.trim(),
        adAccountName: fields.adAccountName.trim() || undefined,
      }});
      queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
      setShowForm(false);
      setStep(1);
    } catch {
      setFormError("Couldn't save your details. Double-check the IDs and try again.");
    }
  };

  const handleDisconnect = async () => {
    await deleteConnection.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
  };

  // ── Step content ───────────────────────────────────────────────────────────
  const steps = [
    {
      label: "Find your Page ID",
      icon: <Monitor className="w-5 h-5" />,
    },
    {
      label: "Find your Ad Account ID",
      icon: <Hash className="w-5 h-5" />,
    },
    {
      label: "Save & connect",
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <WizardProgress currentStep={1} />

      <div className="mt-4 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Facebook className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect Facebook</h1>
          <p className="text-muted-foreground mt-2">
            Link your Facebook Business Page to start running targeted ads.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ) : isConnected && connection && !showForm ? (
          /* ── Already connected ── */
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Facebook Connected</CardTitle>
                  <CardDescription>Your account is linked and ready to run ads.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground">Facebook Page</p>
                  <p className="font-semibold">{connection.fbPageName || connection.fbPageId}</p>
                </div>
                <Badge className="bg-green-500 text-white border-transparent">Active</Badge>
              </div>
              {(connection.adAccountName || connection.adAccountId) && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground">Ad Account</p>
                    <p className="font-semibold">{connection.adAccountName || connection.adAccountId}</p>
                  </div>
                  <Badge variant="secondary">{connection.adAccountId}</Badge>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => setLocation("/campaign/new")}>
                  Continue to Ad Creative
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowForm(true); setStep(1); }}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Update
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                  disabled={deleteConnection.isPending}
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── Step-by-step guide ── */
          <>
            {/* Step progress pills */}
            <div className="flex items-center gap-2">
              {steps.map((s, i) => {
                const n = (i + 1) as 1 | 2 | 3;
                const active = step === n;
                const done = step > n;
                return (
                  <div key={n} className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => done && setStep(n)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
                          : "bg-secondary text-muted-foreground cursor-default"
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold
                        bg-white/20">
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
                      </span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded ${step > n ? "bg-green-300" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1 — Page ID */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    Find your Facebook Page ID
                  </CardTitle>
                  <CardDescription>
                    This is the unique number that identifies your business's Facebook Page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-secondary/30 p-4 space-y-3 text-sm">
                    <p className="font-medium">How to find it:</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>
                        Go to your{" "}
                        <a
                          href="https://www.facebook.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          Facebook Page <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Click <strong>About</strong> in the left sidebar</li>
                      <li>
                        Scroll down to <strong>Page transparency</strong> — your Page ID is the number
                        shown there (e.g. <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">123456789012345</code>)
                      </li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">
                      Alternatively, open your page URL and look for <code className="bg-secondary px-1.5 py-0.5 rounded">id=</code> in the address bar.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fbPageId">Paste your Page ID</Label>
                    <Input
                      id="fbPageId"
                      placeholder="e.g. 123456789012345"
                      value={fields.fbPageId}
                      onChange={set("fbPageId")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fbPageName">
                      Page name <span className="text-muted-foreground text-xs">(optional — just for display)</span>
                    </Label>
                    <Input
                      id="fbPageName"
                      placeholder="e.g. Acme HVAC"
                      value={fields.fbPageName}
                      onChange={set("fbPageName")}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!fields.fbPageId.trim()) { setFormError("Please enter your Page ID first."); return; }
                      setFormError(null);
                      setStep(2);
                    }}
                  >
                    Next — Find Ad Account ID
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                </CardContent>
              </Card>
            )}

            {/* Step 2 — Ad Account ID */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary" />
                    Find your Ad Account ID
                  </CardTitle>
                  <CardDescription>
                    This is in your Facebook Business Manager and always starts with <code className="bg-secondary px-1 rounded text-xs">act_</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-secondary/30 p-4 space-y-3 text-sm">
                    <p className="font-medium">How to find it:</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>
                        Open{" "}
                        <a
                          href="https://business.facebook.com/settings/ad-accounts"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          Facebook Business Settings → Ad Accounts <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Click on your ad account name</li>
                      <li>
                        Copy the <strong>Account ID</strong> shown on the right — it looks like{" "}
                        <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">act_123456789</code>
                      </li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">
                      If you only see the number without <code className="bg-secondary px-1.5 py-0.5 rounded">act_</code>, add it in front — e.g. <code className="bg-secondary px-1.5 py-0.5 rounded">act_987654321</code>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="adAccountId">Paste your Ad Account ID</Label>
                    <Input
                      id="adAccountId"
                      placeholder="act_123456789"
                      value={fields.adAccountId}
                      onChange={set("adAccountId")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adAccountName">
                      Account name <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="adAccountName"
                      placeholder="e.g. Acme Ads"
                      value={fields.adAccountName}
                      onChange={set("adAccountName")}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (!fields.adAccountId.trim()) { setFormError("Please enter your Ad Account ID."); return; }
                        if (!fields.adAccountId.startsWith("act_")) {
                          setFormError("Ad Account ID must start with act_");
                          return;
                        }
                        setFormError(null);
                        setStep(3);
                      }}
                    >
                      Next — Review & connect
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                </CardContent>
              </Card>
            )}

            {/* Step 3 — Review & save */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Review & connect
                  </CardTitle>
                  <CardDescription>
                    Make sure these look right, then hit Connect to link your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border divide-y">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Facebook Page</p>
                        <p className="font-medium">{fields.fbPageName || "—"}</p>
                      </div>
                      <code className="text-xs bg-secondary px-2 py-1 rounded">{fields.fbPageId}</code>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Ad Account</p>
                        <p className="font-medium">{fields.adAccountName || "—"}</p>
                      </div>
                      <code className="text-xs bg-secondary px-2 py-1 rounded">{fields.adAccountId}</code>
                    </div>
                  </div>

                  {formError && <p className="text-sm text-destructive">{formError}</p>}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSave}
                      disabled={createConnection.isPending}
                    >
                      {createConnection.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
                      ) : (
                        <>Connect Facebook <ChevronRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Your ad account is accessed securely through our platform — we never post on your behalf or touch anything outside of the campaigns you create here.
                  </p>
                </CardContent>
              </Card>
            )}

            {isConnected && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
