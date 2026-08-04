import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Layout, FileText, MousePointerClick } from "lucide-react";
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
              <Zap className="w-4 h-4" fill="currentColor" />
              <span>The fastest way to capture leads</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Create a lead magnet page <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">in minutes.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              No web designer needed. Just upload your PDF give-away, and we'll generate a high-converting, professional landing page instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                <Link href="/sign-up">Start for free <ArrowRight className="ml-2 w-5 h-5" /></Link>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">From zero to live in 3 steps</h2>
              <p className="text-lg text-muted-foreground">It’s literally as easy as filling out a form.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />
              
              {[
                {
                  icon: <FileText className="w-6 h-6 text-primary" />,
                  title: "1. Upload your giveaway",
                  desc: "A PDF guide, a discount code, or a checklist. Bring what you have."
                },
                {
                  icon: <Layout className="w-6 h-6 text-primary" />,
                  title: "2. Pick a look",
                  desc: "Choose from layouts proven to convert. We'll automatically style it to match your vibe."
                },
                {
                  icon: <MousePointerClick className="w-6 h-6 text-primary" />,
                  title: "3. Publish & share",
                  desc: "Approve the design and get a live link instantly. Put it in your bio and watch leads roll in."
                }
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
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for business owners, not developers.</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  You know your business inside and out. But setting up domains, configuring hosting, and fighting with page builders? That's not your job.
                </p>
                <ul className="space-y-4">
                  {[
                    "Personal trainers offering free workout plans",
                    "Real estate agents sharing local market guides",
                    "Salons giving away first-visit discount codes",
                    "Consultants capturing emails for their newsletter"
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
                  <div className="w-full h-48 bg-muted rounded-xl mb-6 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=800&q=80" alt="Small business owner" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded mb-3" />
                  <div className="h-4 w-1/2 bg-muted rounded mb-6" />
                  <div className="flex justify-between items-center">
                    <div className="h-10 w-32 bg-primary rounded-lg" />
                    <div className="h-10 w-10 bg-secondary rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to grow your list?</h2>
            <p className="text-xl opacity-90 mb-10">Join thousands of small businesses capturing leads on autopilot.</p>
            <Button size="lg" variant="secondary" asChild className="text-lg px-10 py-7 h-auto text-primary font-bold shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all bg-white hover:bg-gray-50">
              <Link href="/sign-up">Create your first lead magnet</Link>
            </Button>
          </div>
        </section>

        <footer className="py-12 bg-card border-t text-center text-muted-foreground">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center gap-2 mb-4">
              <img src={`${basePath}/logo.svg`} alt="HVCG Logo" className="w-6 h-6 grayscale opacity-50" />
              <span className="font-semibold text-foreground opacity-50">HVCG</span>
            </div>
            <p>© {new Date().getFullYear()} HVCG Inc. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </PublicShell>
  );
}
