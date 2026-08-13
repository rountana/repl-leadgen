import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, Facebook } from "lucide-react";
import { useCreateFbConnection } from "@workspace/api-client-react";

/**
 * Phase 1 stub: simulates a successful Facebook OAuth callback.
 * In Phase 2 this becomes a real OAuth handler that reads `code` + `state` from the URL.
 */
export function MockOAuthCallback() {
  const [, setLocation] = useLocation();
  const hasFired = useRef(false);

  const createConnection = useCreateFbConnection({
    mutation: {
      onSuccess: () => {
        setLocation("/campaign/new");
      },
      onError: () => {
        // Fall back to connect page on error
        setLocation("/connect");
      },
    },
  });

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    // Mock data simulating a real OAuth callback result
    createConnection.mutate({
      data: {
        fbPageId: "mock_page_123456",
        fbPageName: "Demo Business Page",
        adAccountId: "act_mock_789",
        adAccountName: "Demo Ad Account",
      },
    });
  }, [createConnection]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Facebook className="w-8 h-8 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Connecting your Facebook account…</span>
        </div>
      </div>
    </div>
  );
}
