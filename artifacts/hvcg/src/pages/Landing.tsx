import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Layout, FileText, MousePointerClick } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const legalDocuments = {
  privacy: {
    label: "Privacy",
    title: "Privacy Policy",
    paragraphs: [
      "Addlaunch uses the information you provide to create and operate your account, build landing pages, connect advertising accounts, and deliver leads to you.",
      "Depending on how you use the service, this may include account details, uploaded files, business information, landing-page content, and lead information. We may also receive information from service providers that help us authenticate accounts, host the service, or connect to advertising platforms.",
      "Please do not upload sensitive personal information unless you have a lawful reason and the appropriate permissions to do so. You are responsible for providing any notices and obtaining any consent required for the data you collect through your pages and ads.",
    ],
  },
  terms: {
    label: "Terms",
    title: "Terms of Use",
    paragraphs: [
      "By using Addlaunch, you agree to use the service lawfully and to follow the rules of any advertising, email, hosting, or other platform you connect to it.",
      "You are responsible for the content you upload or publish, the accuracy of your offers and claims, the permissions you have for your files and brand assets, and the leads you collect. Addlaunch does not guarantee ad approval, delivery, conversions, or uninterrupted availability.",
      "We may update, suspend, or discontinue parts of the service as it evolves. Please review the final terms, billing terms, and any supplemental agreements that apply to your account before launch.",
    ],
  },
  disclaimer: {
    label: "Disclaimer",
    title: "Important Disclaimer",
    paragraphs: [
      "Addlaunch is a marketing software tool, not a law firm, advertising compliance service, financial adviser, or guarantee of business results.",
      "You should review your landing-page copy, offers, disclosures, consent flows, and ad settings for compliance with the laws and platform policies that apply to your business and audience.",
      "Results vary by business, audience, offer, creative, budget, and platform review. Please get professional advice when you need guidance specific to your situation.",
    ],
  },
  cookies: {
    label: "Cookie Notice",
    title: "Cookie Notice",
    paragraphs: [
      "Addlaunch may use essential cookies and similar technologies to keep you signed in, protect the service, remember preferences, and support secure account functionality.",
      "If optional analytics or integrations are enabled, those providers may use their own technologies subject to their policies. You can control available browser permissions through your browser settings.",
    ],
  },
} as const;

type LegalDocumentKey = keyof typeof legalDocuments;

function LegalDialog({
  documentKey,
  onClose,
}: {
  documentKey: LegalDocumentKey | null;
  onClose: () => void;
}) {
  const document = documentKey ? legalDocuments[documentKey] : null;

  return (
    <Dialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
      {document && (
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{document.title}</DialogTitle>
            <DialogDescription>
              Draft information for review before publishing. This is not legal advice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-6 text-muted-foreground">
            {document.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

export function Landing() {
  const [activeLegalDocument, setActiveLegalDocument] = useState<LegalDocumentKey | null>(null);

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

        <footer className="py-12 bg-card border-t text-muted-foreground">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img src={`${basePath}/logo.svg`} alt="Addlaunch" className="w-6 h-6 grayscale opacity-50" />
                  <span className="font-semibold text-foreground opacity-70">Addlaunch</span>
                </div>
                <p className="max-w-md text-sm leading-6">
                  Marketing software for building landing pages and connecting with the advertising tools you use.
                </p>
              </div>
              <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-3 text-sm md:justify-end">
                {(Object.keys(legalDocuments) as LegalDocumentKey[]).map((documentKey) => (
                  <button
                    key={documentKey}
                    type="button"
                    className="underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                    onClick={() => setActiveLegalDocument(documentKey)}
                  >
                    {legalDocuments[documentKey].label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t pt-5 text-xs leading-5 md:flex-row md:items-center md:justify-between">
              <p>© {new Date().getFullYear()} Addlaunch. All rights reserved.</p>
              <p>
                By using Addlaunch, you agree to the Terms and acknowledge the Privacy Policy. Review all content and
                platform requirements before publishing.
              </p>
            </div>
          </div>
        </footer>
      </div>
      <LegalDialog documentKey={activeLegalDocument} onClose={() => setActiveLegalDocument(null)} />
    </PublicShell>
  );
}
