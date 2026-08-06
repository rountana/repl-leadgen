import { useState } from "react";
import { useLocation } from "wouter";
import {
  Facebook,
  ShieldCheck,
  Users,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Connect() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: connection, isLoading, isError } = useGetFbConnection({
    query: { queryKey: getGetFbConnectionQueryKey(), retry: false },
  });
  const createConnection = useCreateFbConnection();
  const deleteConnection = useDeleteFbConnection();

  const isConnected = connection?.status === "connected";

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    partnerToken: "",
    fbPageId: "",
    fbPageName: "",
    adAccountId: "",
    adAccountName: "",
  });

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setFormError(null);
    if (!fields.partnerToken.startsWith("sk_")) {
      setFormError("Zernio API keys start with sk_ — check your key and try again.");
      return;
    }
    if (!fields.fbPageId || !fields.adAccountId) {
      setFormError("Facebook Page ID and Ad Account ID are required.");
      return;
    }
    if (!fields.adAccountId.startsWith("act_")) {
      setFormError("Ad Account ID must start with act_ (e.g. act_123456789).");
      return;
    }
    try {
      await createConnection.mutateAsync({ data: fields });
      queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
      setShowForm(false);
    } catch {
      setFormError("Failed to save connection. Check your credentials and try again.");
    }
  };

  const handleDisconnect = async () => {
    await deleteConnection.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <WizardProgress currentStep={1} />

      <div className="mt-4 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Facebook className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect Facebook via Zernio</h1>
          <p className="text-muted-foreground mt-2">
            Enter your Zernio API key and Facebook account details to start running ads.
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
                  <CardDescription>Your Zernio account is linked and ready.</CardDescription>
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
              {connection.adAccountName && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground">Ad Account</p>
                    <p className="font-semibold">{connection.adAccountName}</p>
                  </div>
                  <Badge variant="secondary">{connection.adAccountId}</Badge>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => setLocation("/campaign/new")}>
                  Continue to Ad Creative
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowForm(true)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
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
          /* ── Credential entry form ── */
          <>
            {/* How to get the key */}
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4 flex gap-3 items-start">
                <KeyRound className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Where to find your credentials</p>
                  <ol className="mt-1 space-y-1 text-blue-800 list-decimal list-inside">
                    <li>
                      Log in to{" "}
                      <a
                        href="https://zernio.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        zernio.com <ExternalLink className="w-3 h-3" />
                      </a>{" "}
                      and connect your Facebook account under <strong>Settings → Connected accounts</strong>
                    </li>
                    <li>
                      Go to <strong>Settings → API Keys</strong> and create a new key (starts with{" "}
                      <code className="bg-blue-100 px-1 rounded text-xs">sk_</code>)
                    </li>
                    <li>
                      Copy your Facebook Page ID and Ad Account ID from{" "}
                      <strong>Facebook Business Settings</strong>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Credentials</CardTitle>
                <CardDescription>
                  These are stored securely on our server and never exposed to the browser again after saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Zernio API key */}
                <div className="space-y-1.5">
                  <Label htmlFor="partnerToken">Zernio API Key</Label>
                  <div className="relative">
                    <Input
                      id="partnerToken"
                      type={showKey ? "text" : "password"}
                      placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={fields.partnerToken}
                      onChange={set("partnerToken")}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowKey((v) => !v)}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Page ID */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fbPageId">Facebook Page ID</Label>
                    <Input
                      id="fbPageId"
                      placeholder="e.g. 123456789012345"
                      value={fields.fbPageId}
                      onChange={set("fbPageId")}
                    />
                  </div>
                  {/* Page name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fbPageName">
                      Page Name <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="fbPageName"
                      placeholder="e.g. Acme HVAC"
                      value={fields.fbPageName}
                      onChange={set("fbPageName")}
                    />
                  </div>
                  {/* Ad account ID */}
                  <div className="space-y-1.5">
                    <Label htmlFor="adAccountId">Ad Account ID</Label>
                    <Input
                      id="adAccountId"
                      placeholder="act_123456789"
                      value={fields.adAccountId}
                      onChange={set("adAccountId")}
                    />
                  </div>
                  {/* Ad account name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="adAccountName">
                      Ad Account Name <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="adAccountName"
                      placeholder="e.g. Acme Ads"
                      value={fields.adAccountName}
                      onChange={set("adAccountName")}
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={createConnection.isPending}
                  >
                    {createConnection.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        Save & Continue
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  {isConnected && (
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Permissions info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What Zernio accesses on your behalf</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    icon: <ShieldCheck className="w-5 h-5 text-primary" />,
                    title: "Pages Read Engagement",
                    desc: "Read your Page's name and profile to personalize your ads.",
                  },
                  {
                    icon: <TrendingUp className="w-5 h-5 text-primary" />,
                    title: "Ads Management",
                    desc: "Create and manage ad campaigns in your Meta ad account.",
                  },
                  {
                    icon: <Users className="w-5 h-5 text-primary" />,
                    title: "Lead Access",
                    desc: "Receive leads generated from your Facebook ads in real time.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="mt-0.5 shrink-0">{item.icon}</div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {(isError || (!isConnected && !isLoading)) && (
              <p className="text-xs text-center text-muted-foreground">
                No Facebook account connected yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
