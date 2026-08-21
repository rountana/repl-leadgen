import { Link } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { User, LogOut, Loader2, LayoutDashboard, UserCircle, Users, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicBasePath } from "@/lib/publicRoutes";

export function Shell({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const basePath = getPublicBasePath();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/campaigns" className="flex shrink-0 items-center gap-2 hover:opacity-90 transition-opacity">
            <img src={`${basePath}/logo.svg`} alt="Addlaunch" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-foreground">Addlaunch</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/how-it-works"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:hidden"
              title="How it works"
            >
              <CircleHelp className="h-5 w-5" />
              <span className="sr-only">How it works</span>
            </Link>

            <Link
              href="/how-it-works"
              className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <CircleHelp className="h-4 w-4" />
              How it works
            </Link>

            <Link
              href="/campaigns"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              href="/leads"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-4 h-4" />
              Leads
            </Link>

            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <UserCircle className="w-4 h-4" />
              Profile
            </Link>

            {!isLoaded ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-2 ml-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                    {user?.firstName?.[0] || <User className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
