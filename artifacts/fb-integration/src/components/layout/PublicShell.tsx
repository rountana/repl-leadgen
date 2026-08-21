import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function PublicShell({
  children,
  onSignIn,
}: {
  children: React.ReactNode;
  onSignIn?: () => void;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="w-full absolute top-0 z-50 bg-transparent">
        <div className="container mx-auto flex min-h-20 flex-col items-stretch justify-center gap-3 px-4 py-3 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-0">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-90 transition-opacity">
              <img src={`${basePath}/logo.svg`} alt="Addlaunch" className="w-8 h-8" />
              <span className="font-bold text-xl tracking-tight text-foreground">Addlaunch</span>
            </Link>
          </div>

          <nav className="flex items-center justify-end gap-2 sm:gap-4">
            <Button variant="ghost" onClick={onSignIn}>
              Log in
            </Button>
            <Button
              onClick={onSignIn}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            >
              Get Started
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
