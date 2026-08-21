import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import { Landing } from "@/pages/Landing";
import { Dashboard } from "@/pages/Dashboard";
import { NewPath } from "@/pages/NewPath";
import { Create } from "@/pages/Create";
import { Review } from "@/pages/Review";
import { Live } from "@/pages/Live";
import { Profile } from "@/pages/Profile";
import { PublicCapture } from "@/pages/PublicCapture";
import { HowItWorks } from "@/pages/HowItWorks";
import { Shell } from "@/components/layout/Shell";
import { getPublicBasePath } from "@/lib/publicRoutes";

const queryClient = new QueryClient();

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
const basePath = getPublicBasePath();

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
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`, // Addlaunch logo
  },
  variables: {
    colorPrimary: "hsl(239 84% 67%)", // Indigo 600
    colorForeground: "hsl(222 47% 11%)",
    colorMutedForeground: "hsl(215 16% 47%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(222 47% 11%)",
    colorNeutral: "hsl(214 32% 91%)",
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
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive",
    logoBox: "h-12 flex justify-center mb-4",
    logoImage: "h-full w-auto",
    socialButtonsBlockButton: "border border-border hover:bg-secondary/50 transition-colors",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md",
    formFieldInput: "border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-md bg-background text-foreground",
    footerAction: "bg-secondary/30 pt-4 pb-6",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border border-destructive/20 text-destructive",
    otpCodeFieldInput: "border-border focus:border-primary",
    formFieldRow: "mb-4",
    main: "p-8",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="z-10 w-full flex justify-center">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${window.location.origin}${basePath}/dashboard`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="z-10 w-full flex justify-center">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, [key: string]: any }) {
  return (
    <>
      <Show when="signed-in">
        <Shell>
          <Component {...rest} />
        </Shell>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
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
            subtitle: "Sign in to manage your lead magnets",
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
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
          <Route path="/how-it-works"><ProtectedRoute component={HowItWorks} /></Route>
          <Route path="/new"><ProtectedRoute component={NewPath} /></Route>
          <Route path="/create"><ProtectedRoute component={Create} /></Route>
          <Route path="/review/:id"><ProtectedRoute component={Review} /></Route>
          <Route path="/live/:id"><ProtectedRoute component={Live} /></Route>
          <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
          <Route path="/:id" component={PublicCapture} />
          
          <Route>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
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
