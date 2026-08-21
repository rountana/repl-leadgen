import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Link2,
  MapPin,
  PauseCircle,
  Target,
  WalletCards,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicShell } from "@/components/layout/PublicShell";
import { useLocation } from "wouter";

const steps = [
  {
    number: "01",
    icon: Zap,
    title: "Choose an ad idea",
    description:
      "Start with a proven concept for your industry. The headline, copy, and creative are pre-filled so you can make them your own.",
  },
  {
    number: "02",
    icon: Target,
    title: "Set your audience",
    description:
      "Choose who should see your ad, drop a pin on the map, set a radius, and decide how much you want to spend each day.",
  },
  {
    number: "03",
    icon: Link2,
    title: "Review and launch",
    description:
      "Connect your Facebook account, check the preview, and submit your campaign. You can make the final activation decision in Ads Manager.",
  },
];

const essentials = [
  {
    icon: MapPin,
    title: "A local service area",
    description: "Your address or service location helps Addlaunch find the right nearby audience.",
  },
  {
    icon: WalletCards,
    title: "A daily budget",
    description: "Set a budget that works for your business. Addlaunch shows the minimum required before you submit.",
  },
  {
    icon: Link2,
    title: "A destination",
    description: "Send interested people to your website, lead magnet, or another page where they can take action.",
  },
];

export function HowItWorks() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <CircleHelp className="h-4 w-4" />
          Your campaign workflow
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How it works</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Go from a campaign idea to a local Facebook ad without having to figure out Ads Manager first.
        </p>
      </section>

      <section className="relative mt-12 grid gap-5 md:grid-cols-3">
        <div className="pointer-events-none absolute left-[16%] right-[16%] top-14 hidden h-px bg-border md:block" />
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number} className="relative border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-bold tracking-wider text-primary/70">{step.number}</span>
                </div>
                <h2 className="text-xl font-bold">{step.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
            <PauseCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">You stay in control</p>
            <h2 className="mt-2 text-2xl font-bold">Every campaign is submitted paused.</h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
              Addlaunch sends the campaign to Meta as <strong className="font-semibold text-foreground">PAUSED</strong>.
              Review the finished campaign in Facebook Ads Manager and activate it when you are ready.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">What you&apos;ll need</h2>
          <p className="mt-2 text-muted-foreground">A few simple details are enough to get started.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {essentials.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-foreground px-6 py-8 text-center text-background sm:px-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          <h2 className="mt-3 text-2xl font-bold">Ready to create your first campaign?</h2>
          <p className="mt-2 text-background/70">
            Pick an idea, set your audience, and let Addlaunch guide you through the rest.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 shadow-md">
            <Link href="/campaign/new">
              Create an ad <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

export function PublicHowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <PublicShell onSignIn={() => setLocation("/sign-in")}>
      <div className="pt-28 sm:pt-20">
        <HowItWorks />
      </div>
    </PublicShell>
  );
}