import { useEffect, useRef, useState } from "react";
import { ClerkProvider, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import { Connect } from "@/pages/Connect";
import { MockOAuthCallback } from "@/pages/MockOAuthCallback";
import { CampaignWizard } from "@/pages/CampaignWizard";
import { Campaigns } from "@/pages/Campaigns";
import { Profile } from "@/pages/Profile";
import { AuthPage, Landing } from "@/pages/Landing";
import { Shell } from "@/components/layout/Shell";
import { takePostSignInReturnTo } from "@/lib/authRedirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

function resolveClerkProxyUrl(): string {
  const configuredProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
  if (!configuredProxyUrl) {
    return configuredProxyUrl;
  }

  try {
    const configured = new URL(configuredProxyUrl, window.location.origin);
    // Netlify proxies the app through the generated Replit deployment. Keep
    // Clerk requests same-origin in the browser, while the API proxy still
    // identifies the managed Clerk instance with the Replit deployment host.
    if (configured.origin !== window.location.origin) {
      return `${window.location.origin}${configured.pathname}${configured.search}`;
    }
  } catch {
    // Keep Clerk's injected value if it cannot be parsed as a URL.
  }

  return configuredProxyUrl;
}

const clerkProxyUrl = resolveClerkProxyUrl();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  try {
    const parsed = new URL(path, window.location.origin);
    path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // Keep the original path when Clerk supplies a relative route.
  }
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: `${window.location.origin}${basePath}/`,
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(239 84% 67%)",
    colorForeground: "hsl(222 47% 11%)",
    colorMutedForeground: "hsl(215 16% 47%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(220 47% 11%)",
    colorNeutral: "hsl(210 40% 96%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md",
    formFieldInput: "border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-md bg-background text-foreground",
    main: "p-8",
  },
};

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location] = useLocation();
  const returnTo = `${location}${window.location.search}${window.location.hash}`;

  return (
    <>
      <Show when="signed-in">
        <Shell>
          <Component />
        </Shell>
      </Show>
      <Show when="signed-out">
        <Redirect to={`/?returnTo=${encodeURIComponent(returnTo)}`} />
      </Show>
    </>
  );
}

function AuthenticatedHomeRedirect() {
  const [destination] = useState(() => takePostSignInReturnTo() ?? "/campaigns");
  return <Redirect to={destination} />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to keep growing your business",
          },
        },
        signUp: {
          start: {
            title: "Start capturing leads",
            subtitle: "Create your account in seconds",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/">
            <Show when="signed-in">
              <AuthenticatedHomeRedirect />
            </Show>
            <Show when="signed-out">
              <Landing />
            </Show>
          </Route>
          <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
          <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
          <Route path="/auth/callback" component={MockOAuthCallback} />
          <Route path="/connect">
            <ProtectedRoute component={Connect} />
          </Route>
          <Route path="/campaign/new">
            <ProtectedRoute component={CampaignWizard} />
          </Route>
          <Route path="/campaigns">
            <ProtectedRoute component={Campaigns} />
          </Route>
          <Route path="/profile">
            <ProtectedRoute component={Profile} />
          </Route>
          <Route>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-muted-foreground">Page not found.</p>
              </div>
            </div>
          </Route>
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
