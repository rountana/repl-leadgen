import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="w-full absolute top-0 z-50 bg-transparent">
        <div className="container mx-auto flex min-h-20 flex-col items-stretch justify-center gap-3 px-4 py-3 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-0">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-90 transition-opacity">
              <img src={`${basePath}/logo.svg`} alt="Addlaunch" className="w-8 h-8" />
              <span className="font-bold text-xl tracking-tight text-foreground">Addlaunch</span>
            </Link>
            <span className="hidden items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:inline-flex">
              Lead Magnet
            </span>
            <span
              aria-label="Lead Magnet"
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-bold text-primary sm:hidden"
              title="Lead Magnet"
            >
              LM
            </span>
          </div>
          
          <nav className="flex items-center justify-end gap-2 sm:gap-4">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Log in</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all">
              <Link href="/sign-up">Get Started</Link>
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
