import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Facebook,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WizardProgress } from "@/components/WizardProgress";
import {
  useGetFbConnection,
  useCreateFbConnection,
  useDeleteFbConnection,
  getGetFbConnectionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Zernio requires adAccountId in the form act_<digits>. Anything else (e.g. act_mock_789) will be rejected. */
function isRealAdAccountId(id: string | null | undefined): boolean {
  return /^act_\d+$/.test(id ?? "");
}

interface FbPage { id: string; name: string }
interface FbAdAccount { id: string; name: string }

export function Connect() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useGetFbConnection({
    query: { queryKey: getGetFbConnectionQueryKey(), retry: false },
  });
  const createConnection = useCreateFbConnection();
  const deleteConnection = useDeleteFbConnection();

  const isConnected = connection?.status === "connected";

  // ── OAuth result state ────────────────────────────────────────────────────
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pickerPages, setPickerPages] = useState<FbPage[] | null>(null);
  const [pickerAccounts, setPickerAccounts] = useState<FbAdAccount[] | null>(null);
  const [selectedPage, setSelectedPage] = useState<FbPage | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<FbAdAccount | null>(null);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // ── Login button state ────────────────────────────────────────────────────
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Process OAuth redirect params on mount ─────────────────────────────
  useEffect(() => {
    const fbConnected = params.get("fb_connected");
    const fbError = params.get("fb_error");
    const fbData = params.get("fb_data");
    const fbState = params.get("fb_state");

    if (fbConnected === "1") {
      // Auto-connected — invalidate query then skip straight to the campaign wizard
      queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
      setLocation("/campaign/new");
    } else if (fbError) {
      setOauthError(decodeURIComponent(fbError));
      window.history.replaceState({}, "", `${basePath}/connect`);
    } else if (fbData) {
      try {
        const { pages, adAccounts } = JSON.parse(
          atob(decodeURIComponent(fbData)),
        ) as { pages: FbPage[]; adAccounts: FbAdAccount[] };
        setPickerPages(pages);
        setPickerAccounts(adAccounts);
        setSelectedPage(pages[0] ?? null);
        setSelectedAccount(adAccounts[0] ?? null);
        setOauthState(fbState);
        window.history.replaceState({}, "", `${basePath}/connect`);
      } catch {
        setOauthError("Failed to read Facebook account data. Please try again.");
      }
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFacebookLogin = async () => {
    setLoginLoading(true);
    setOauthError(null);
    try {
      const res = await fetch("/api/auth/facebook/init", { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        throw new Error(body?.error ?? "Server error");
      }
      const { authUrl } = await res.json() as { authUrl: string };
      // Facebook blocks loading inside iframes ("refused to connect").
      // In production the app runs at the top level, so a normal redirect works.
      // In embedded preview contexts (e.g. Replit's iframe), window.top is
      // cross-origin and can't be navigated — open a new tab instead so the
      // OAuth flow can complete.
      if (window.self === window.top) {
        window.location.href = authUrl;
      } else {
        window.open(authUrl, "_blank", "noopener");
      }
    } catch (err: any) {
      setLoginLoading(false);
      setOauthError(err?.message ?? "Failed to start Facebook login. Please try again.");
    }
  };

  const handlePickerSave = async () => {
    if (!selectedPage || !selectedAccount) return;
    setPickerSaving(true);
    try {
      if (oauthState) {
        const response = await fetch("/api/auth/facebook/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: oauthState,
            page: selectedPage,
            adAccount: selectedAccount,
          }),
        });
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "Failed to complete Facebook connection.");
        }
      } else {
        await createConnection.mutateAsync({
          data: {
            fbPageId: selectedPage.id,
            fbPageName: selectedPage.name,
            adAccountId: selectedAccount.id,
            adAccountName: selectedAccount.name,
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
      setPickerPages(null);
      setPickerAccounts(null);
      setOauthState(null);
    } catch (err: any) {
      setOauthError(err?.message ?? "Failed to save your selection. Please try again.");
    } finally {
      setPickerSaving(false);
    }
  };

  const handleDisconnect = async () => {
    await deleteConnection.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetFbConnectionQueryKey() });
    setShowUpdate(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
            Log in with Facebook to link your Business Page and Ad Account — we'll pull the details automatically.
          </p>
        </div>

        {/* OAuth error */}
        {oauthError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ) : pickerPages && pickerAccounts ? (
          /* ── Multi-account picker ── */
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Facebook connected — choose your accounts
              </CardTitle>
              <CardDescription>
                We found multiple Pages or Ad Accounts. Select which ones to use for your ads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Facebook Page</label>
                <div className="relative">
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedPage?.id ?? ""}
                    onChange={(e) => setSelectedPage(pickerPages.find((p) => p.id === e.target.value) ?? null)}
                  >
                    {pickerPages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ad Account</label>
                <div className="relative">
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedAccount?.id ?? ""}
                    onChange={(e) => setSelectedAccount(pickerAccounts.find((a) => a.id === e.target.value) ?? null)}
                  >
                    {pickerAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handlePickerSave}
                disabled={!selectedPage || !selectedAccount || pickerSaving}
              >
                {pickerSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  <>Connect <ChevronRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : isConnected && connection && !showUpdate ? (
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
              {isRealAdAccountId(connection.adAccountId) ? (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={() => setLocation("/campaign/new")}>
                    Continue to Ad Creative
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowUpdate(true)}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Switch account
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
              ) : (
                <div className="pt-2 space-y-3">
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-900">Ad account needs reconnecting</p>
                      <p className="text-amber-800 mt-0.5">
                        The linked ad account ID ({connection.adAccountId}) isn't a real Facebook Ad Account.
                        Disconnect and click <strong>Continue with Facebook</strong> again to pull your real account.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-amber-300 text-amber-900 hover:bg-amber-50"
                      onClick={handleDisconnect}
                      disabled={deleteConnection.isPending}
                    >
                      {deleteConnection.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disconnecting…</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" />Disconnect &amp; Reconnect</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ── Login button (initial or update) ── */
          <>
            <Card>
              <CardContent className="p-8 flex flex-col items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[#1877F2]/10 flex items-center justify-center">
                  <Facebook className="w-7 h-7 text-[#1877F2]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="font-semibold text-lg">One click to connect</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Log in with Facebook and we'll automatically find your Business Page and Ad Account — no copying IDs.
                  </p>
                </div>

                <Button
                  className="w-full max-w-xs h-11 text-base font-semibold gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white"
                  onClick={handleFacebookLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Redirecting to Facebook…</>
                  ) : (
                    <><Facebook className="w-5 h-5" />Continue with Facebook</>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  We request read-only access to your Pages and Ad Accounts. We never post on your behalf or access private messages.
                </p>
              </CardContent>
            </Card>

            {showUpdate && (
              <Button
                variant="ghost" size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowUpdate(false)}
              >
                Cancel
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
