import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LayoutTemplate,
  Megaphone,
  MousePointerClick,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    icon: FileText,
    title: "Create your lead magnet",
    description:
      "Start a Give-Away Page, upload your guide, checklist, or offer, then add the details customers need to see.",
  },
  {
    number: "02",
    icon: LayoutTemplate,
    title: "Review and publish your page",
    description:
      "Choose a conversion-focused template, review the finished page, and publish it to get a shareable link that captures leads.",
  },
  {
    number: "03",
    icon: Megaphone,
    title: "Attach it to a Facebook ad campaign",
    description:
      "From your live page, choose Create Facebook Ad. Your page link is pre-filled so you can set your audience and budget faster.",
  },
];

export function HowItWorks() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <MousePointerClick className="h-4 w-4" />
          Your lead-generation workflow
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How it works</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Create a useful resource, turn it into a Give-Away Page, and connect it to a Facebook ad that brings the right people to it.
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">What happens next</p>
            <h2 className="mt-2 text-2xl font-bold">Your page is ready before you create the ad.</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              When you click <strong className="font-semibold text-foreground">Create Facebook Ad</strong> from a live page, Addlaunch passes the page link into the ad builder. Meta receives the ad as paused, so you can make the final activation decision in Facebook Ads Manager.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-medium shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            You stay in control
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-foreground px-6 py-8 text-center text-background sm:px-10">
        <h2 className="text-2xl font-bold">Ready to turn your offer into leads?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-background/70">
          Start with your give-away resource and publish a page your next Facebook ad can promote.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-6 shadow-md">
          <Link href="/new">
            Create a Give-Away Page <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}