import { useLocation } from "wouter";
import { Facebook, ShieldCheck, Users, TrendingUp, ChevronRight, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WizardProgress } from "@/components/WizardProgress";
import { useGetFbConnection, getGetFbConnectionQueryKey } from "@workspace/api-client-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Connect() {
  const [, setLocation] = useLocation();

  const { data: connection, isLoading, isError } = useGetFbConnection({
    query: {
      queryKey: getGetFbConnectionQueryKey(),
      retry: false,
    },
  });

  const isConnected = connection?.status === "connected";

  const handleConnect = () => {
    // Phase 1: stub redirect that simulates OAuth
    window.location.href = `${basePath}/auth/callback?mock=1`;
  };

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
        ) : isConnected && connection ? (
          /* Already connected */
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Facebook Connected</CardTitle>
                  <CardDescription>Your account is linked and ready.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground">Facebook Page</p>
                  <p className="font-semibold">{connection.fbPageName || "Connected Page"}</p>
                </div>
                <Badge className="bg-green-500 text-white border-transparent">Active</Badge>
              </div>
              {connection.adAccountName && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground">Ad Account</p>
                    <p className="font-semibold">{connection.adAccountName}</p>
                  </div>
                  <Badge variant="secondary">Linked</Badge>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => setLocation("/campaign/new")}
                >
                  Continue to Ad Creative
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={handleConnect}
                  title="Reconnect with a different account"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Not connected */
          <>
            {/* Permissions info card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What we'll access</CardTitle>
                <CardDescription>
                  We request only the permissions needed to run your ads. We never post on your behalf or access private messages.
                </CardDescription>
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
                    desc: "Create and manage ad campaigns in your ad account.",
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

            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base font-semibold gap-3"
                onClick={handleConnect}
              >
                <Facebook className="w-5 h-5" />
                Continue with Facebook
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll be redirected to Facebook to authorize access. This is a genuine Facebook login flow — your credentials go directly to Facebook, not to us.
              </p>
            </div>

            {isError && (
              <p className="text-sm text-center text-muted-foreground">
                No Facebook account connected yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
