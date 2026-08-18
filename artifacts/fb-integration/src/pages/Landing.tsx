import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Rocket, Target, LayoutDashboard, Zap } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Landing() {
  return (
    <PublicShell>
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
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
                asChild
                className="text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                <Link href="/sign-in">
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
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

        {/* Who it's for */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Built for business owners, not marketers.
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  You know your customers better than any agency does. Now you can reach them on Facebook — without spending weeks learning Ads Manager.
                </p>
                <ul className="space-y-4">
                  {[
                    "Restaurants promoting weekend specials to nearby diners",
                    "Gyms filling morning class slots with local residents",
                    "Salons running first-visit discount campaigns",
                    "Service businesses reaching homeowners within 10 miles",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-foreground font-medium">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/5 rounded-3xl transform rotate-3" />
                <div className="bg-card rounded-3xl p-8 border shadow-xl relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <img src={`${basePath}/logo.svg`} alt="Addlaunch" className="w-10 h-10" />
                    <div>
                      <div className="h-3 w-28 bg-muted rounded mb-1.5" />
                      <div className="h-3 w-16 bg-muted/60 rounded" />
                    </div>
                  </div>
                  <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-indigo-400/20 rounded-xl mb-6 flex items-center justify-center">
                    <Rocket className="w-12 h-12 text-primary/60" />
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded mb-3" />
                  <div className="h-4 w-1/2 bg-muted rounded mb-6" />
                  <div className="flex justify-between items-center">
                    <div className="h-10 w-32 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-semibold">Launch Ad</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Live
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to reach more customers?</h2>
            <p className="text-xl opacity-90 mb-10">
              Join local business owners running smarter Facebook ads with Addlaunch.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="text-lg px-10 py-7 h-auto text-primary font-bold shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all bg-white hover:bg-gray-50"
            >
              <Link href="/sign-in">Launch your first ad</Link>
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
    </PublicShell>
  );
}
