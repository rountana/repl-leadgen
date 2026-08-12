import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { User, LogOut, ArrowRight, Loader2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Shell({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src={`${basePath}/logo.svg`} alt="HVCG Logo" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-foreground">HVCG</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {!isLoaded ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  Profile
                </Link>
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {user?.firstName?.[0] || <User className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-medium">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                  title="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
                <Button onClick={() => setLocation("/new")} className="hidden sm:flex gap-2">
                  New Campaign <ArrowRight className="w-4 h-4" />
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
