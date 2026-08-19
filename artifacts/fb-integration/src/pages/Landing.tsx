import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignIn } from "@clerk/react";
import {
  ArrowRight,
  CheckCircle2,
  Rocket,
  Target,
  LayoutDashboard,
  Zap,
  FileText,
  Mail,
  Phone,
  User,
  Star,
  X,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { getSafeReturnPath, rememberPostSignInReturnTo } from "@/lib/authRedirect";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const INDUSTRIES = [
  {
    emoji: "🏠",
    label: "Home contractors",
    desc: "Fill your schedule with nearby renovation and remodeling leads — before your competitors do.",
  },
  {
    emoji: "🛡️",
    label: "Insurance agents",
    desc: "Generate exclusive home, auto, and life insurance leads in your territory without buying shared lists.",
  },
  {
    emoji: "🏦",
    label: "Mortgage lenders",
    desc: "Reach first-time buyers and refinancers in your lending area at exactly the right moment.",
  },
  {
    emoji: "📈",
    label: "Financial advisors",
    desc: "Attract local clients who are ready to talk about retirement, investment, and wealth planning.",
  },
  {
    emoji: "✈️",
    label: "Travel agents",
    desc: "Promote vacation packages and group trips to nearby families and couples looking to get away.",
  },
];

export function Landing() {
  const [showSignIn, setShowSignIn] = useState(false);
  const returnTo = getSafeReturnPath(
    new URLSearchParams(window.location.search).get("returnTo"),
  );
  const postSignInUrl = `${window.location.origin}${basePath}${returnTo ?? "/campaigns"}`;
  const openSignIn = () => {
    // OAuth callbacks can omit the landing-page query string. Preserve a
    // validated protected-page destination for the authenticated root route.
    rememberPostSignInReturnTo(returnTo);
    setShowSignIn(true);
  };

  return (
    <PublicShell onSignIn={openSignIn}>
      <div className="flex flex-col min-h-screen">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
          <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Rocket className="w-4 h-4" fill="currentColor" />
              <span>Facebook ads that actually reach local customers</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Launch a Facebook ad{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
                in minutes.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              No agency needed. Pick a template, set your budget and radius, and go live — straight from your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={openSignIn}
                className="text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="py-24 bg-card border-y">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">From idea to live ad in 3 steps</h2>
              <p className="text-lg text-muted-foreground">It's literally as easy as filling out a form.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

              {[
                {
                  icon: <Zap className="w-6 h-6 text-primary" />,
                  title: "1. Pick a template",
                  desc: "Choose from ad templates built for your industry. Your headline, copy, and image — all pre-filled and ready to tweak.",
                },
                {
                  icon: <Target className="w-6 h-6 text-primary" />,
                  title: "2. Set your audience",
                  desc: "Drop a pin on the map, choose a radius, and set a daily budget. Real targeting controls, no guesswork.",
                },
                {
                  icon: <LayoutDashboard className="w-6 h-6 text-primary" />,
                  title: "3. Launch & track",
                  desc: "Connect your Facebook account and go live. Monitor performance directly from your Addlaunch dashboard.",
                },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center relative bg-card pt-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who it's for ─────────────────────────────────────────────── */}
        <section className="py-24 bg-card border-y">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Discover new customers and opportunities—minus the heavy lifting
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Addlaunch helps you put the right offer in front of the right locals — without needing to figure out Ads Manager.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {INDUSTRIES.map((ind, i) => (
                <div
                  key={i}
                  className="bg-background rounded-2xl border p-6 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-4">{ind.emoji}</div>
                  <h3 className="font-bold text-lg mb-2">{ind.label}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{ind.desc}</p>
                </div>
              ))}

              {/* "and more" card */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-start justify-between">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed mb-4">
                  "I used to spend $500/month on a marketing agency. Now I spend $10/day on ads and do it myself in twenty minutes."
                </p>
                <p className="text-xs text-muted-foreground font-medium">— Addlaunch user</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Addpage feature ──────────────────────────────────────────── */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* Left: mock lead capture page */}
              <div className="relative order-2 md:order-1">
                <div className="absolute inset-0 bg-violet-500/5 rounded-3xl transform -rotate-2" />
                <div className="bg-card rounded-3xl border shadow-xl relative z-10 overflow-hidden">
                  <div className="bg-gradient-to-br from-primary to-violet-600 px-6 py-8 text-white text-center">
                    <div className="text-xs font-medium uppercase tracking-widest opacity-80 mb-2">Free Guide</div>
                    <div className="text-lg font-bold leading-snug mb-1">5 Things Every Homeowner Should Know Before Hiring a Contractor</div>
                    <div className="text-sm opacity-80 mt-2">Download instantly — no fluff, just practical advice.</div>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">Your name</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">Email address</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">Phone (optional)</span>
                    </div>
                    <div className="w-full rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">
                      Send Me the Guide →
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">No spam. Unsubscribe any time.</p>
                  </div>
                </div>
              </div>

              {/* Right: copy */}
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
                  <FileText className="w-3.5 h-3.5" />
                  Introducing Addpage
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                  No landing page?{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-primary">
                    Build one in 60 seconds.
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Every great ad needs somewhere to send people. Addpage lets you build a high-converting giveaway page — a free guide, checklist, or offer — that captures names, emails, and phone numbers automatically.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Pair your ad directly with a lead capture page",
                    "Offer a free guide, checklist, or consultation",
                    "Leads delivered straight to your dashboard",
                    "No developer or web designer needed",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-foreground font-medium">
                      <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Give it a try — free to start.</h2>
            <p className="text-xl opacity-90 mb-10">
              Your first ad takes about five minutes. No agency, no contract, no complicated setup.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={openSignIn}
              className="text-lg px-10 py-7 h-auto text-primary font-bold shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all bg-white hover:bg-gray-50"
            >
              Launch your first ad
            </Button>
          </div>
        </section>

        <footer className="py-12 bg-card border-t text-center text-muted-foreground">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center gap-2 mb-4">
              <img src={`${basePath}/logo.svg`} alt="Addlaunch" className="w-6 h-6 grayscale opacity-50" />
              <span className="font-semibold text-foreground opacity-50">Addlaunch</span>
            </div>
            <p>© {new Date().getFullYear()} Addlaunch. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* ── Sign-in modal ─────────────────────────────────────────────── */}
      {showSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSignIn(false); }}
        >
          <div className="relative w-full max-w-[440px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Close button — top-right inside the card */}
            <button
              onClick={() => setShowSignIn(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Strip Clerk's own card/box chrome so our wrapper owns all framing */}
            <SignIn
              forceRedirectUrl={postSignInUrl}
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full !shadow-none !border-0 !rounded-none",
                  card: "!shadow-none !border-0 !bg-transparent !rounded-none",
                },
              }}
            />
          </div>
        </div>
      )}
    </PublicShell>
  );
}
