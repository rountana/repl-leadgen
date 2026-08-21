import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  FileText,
  KeyRound,
  LayoutTemplate,
  Link2,
  MapPin,
  PauseCircle,
  Settings2,
  Target,
  Users,
  WalletCards,
} from "lucide-react";

import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const workflowSteps = [
  {
    number: "01",
    icon: BookOpen,
    title: "Understand the lead magnet",
    description:
      "A lead magnet is a useful resource—such as a guide, checklist, or offer—that people receive after they submit their contact details.",
  },
  {
    number: "02",
    icon: LayoutTemplate,
    title: "Choose a template",
    description:
      "Select an ad template for your industry. Addlaunch supplies the headline, primary text, creative direction, and call to action so you do not have to start with a blank form.",
  },
  {
    number: "03",
    icon: Settings2,
    title: "Adjust the prepared content",
    description:
      "Review the pre-filled content and edit the details that are specific to your business. You can use the template as-is or tailor it before continuing.",
  },
  {
    number: "04",
    icon: Target,
    title: "Set targeting and budget",
    description:
      "Choose the audience, location pin, radius, and daily budget. These settings control who Meta can show the ad to and how much it can spend.",
  },
  {
    number: "05",
    icon: KeyRound,
    title: "Connect Facebook and review",
    description:
      "Use Facebook authentication to connect the Page and ad account you manage. Review the preview and campaign details before submitting.",
  },
  {
    number: "06",
    icon: PauseCircle,
    title: "Submit, then activate in Ads Manager",
    description:
      "Addlaunch creates the campaign in Meta as PAUSED. Open Facebook Ads Manager to make the final review and activation decision.",
  },
];

const prerequisites = [
  {
    icon: Users,
    title: "A Facebook Page and ad account",
    description:
      "Set up the Facebook Page, Meta ad account, and payment method you plan to use before connecting Addlaunch.",
  },
  {
    icon: KeyRound,
    title: "Permission to connect that account",
    description:
      "You must be able to authenticate the Page and ad account through Facebook. Addlaunch does not create the account for you.",
  },
  {
    icon: Link2,
    title: "A destination for the ad",
    description:
      "Use a published Addlaunch Lead Magnet page or an external URL where people can take the next step.",
  },
];

export function HowItWorks() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <CircleHelp className="h-4 w-4" />
          Facebook Ads module guide
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How to use Facebook Ads</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl">
          This guide explains what the module does, what you need before starting, and how it connects your ads to
          lead capture.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">What this module is for</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The Facebook Ads module helps you prepare a local Facebook campaign, choose its audience and budget,
              connect the correct Meta account, and submit the campaign for review.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <PauseCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">What it does not do</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Addlaunch does not replace Facebook Ads Manager. It creates the campaign as PAUSED so you can inspect
              it and decide when to activate it in Meta.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Before you start</h2>
          <p className="mt-2 text-muted-foreground">Complete these prerequisites before opening the campaign builder.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {prerequisites.map((item) => {
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

      <section className="mt-14">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Follow the workflow in the app</h2>
          <p className="mt-2 text-muted-foreground">Each step corresponds to a part of the campaign builder.</p>
        </div>
        <div className="relative mt-7 grid gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-14 hidden h-px bg-border md:block" />
          {workflowSteps.map((step) => {
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
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Use prepared content</p>
            <h2 className="mt-2 text-2xl font-bold">Templates are the starting point, not a blank page.</h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
              Browse the template gallery, pick the closest match for your business, and review the supplied copy
              and creative. Edit the business-specific details, but you do not need to write the entire ad yourself.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">How Lead Magnet and Facebook Ads work together</h2>
          <p className="mx-auto mt-2 max-w-3xl text-muted-foreground">
            The two modules have separate jobs: the Lead Magnet module captures the submission, while this module
            sends the paid traffic.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              number: "1",
              title: "Build and publish the page",
              description:
                "Create a lead magnet and publish its page in the Lead Magnet module. A live page has the destination URL your ad needs.",
            },
            {
              number: "2",
              title: "Start the ad from that page",
              description:
                "Choose Create Facebook Ad from the live lead magnet page. Addlaunch opens the Facebook Ads module with the destination URL pre-filled.",
            },
            {
              number: "3",
              title: "Capture and manage submissions",
              description:
                "People who submit the connected lead magnet appear in the authenticated Leads dashboard, where you can filter and export them.",
            },
          ].map((item) => (
            <div key={item.number} className="rounded-2xl border bg-card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {item.number}
              </span>
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold">When the destination is a Lead Magnet</h2>
            </div>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The ad sends people to your published page. When they submit the form, the submission is stored with
              that lead magnet and shown in the Leads dashboard.
            </p>
            <Link href="/leads" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open Leads <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">When the destination is external</h2>
            </div>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Addlaunch can send the ad to an external website, but submissions collected by that external system
              are managed there—not in the Addlaunch Leads dashboard.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Facebook authentication and control</p>
            <h2 className="mt-2 text-2xl font-bold">You choose which Facebook account Addlaunch can use.</h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
              Connect through Facebook&apos;s authentication flow, select the Page and ad account you manage, and
              review the campaign before submitting it. After submission, the campaign remains paused until you
              activate it in Ads Manager.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-foreground px-6 py-8 text-center text-background sm:px-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <WalletCards className="h-7 w-7 text-emerald-400" />
          <h2 className="mt-3 text-2xl font-bold">Next step: open the campaign builder</h2>
          <p className="mt-2 text-background/70">
            Start after your Facebook Page, ad account, payment method, and destination are ready.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 shadow-md">
            <Link href="/campaign/new">
              Open campaign builder <ArrowRight className="ml-2 h-4 w-4" />
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