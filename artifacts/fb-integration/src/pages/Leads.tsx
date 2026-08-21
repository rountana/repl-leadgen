import { useMemo, useState } from "react";
import { Download, Inbox, Loader2, RefreshCw, Users } from "lucide-react";
import { useListLeads } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { escapeLeadCsvValue } from "@/lib/leadsCsv";

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function downloadCsv(
  leads: Array<{
    name: string;
    email: string;
    phone?: string | null;
    leadMagnetTitle?: string | null;
    createdAt: string;
  }>,
): void {
  const rows = [
    ["Name", "Email", "Phone", "Giveaway", "Submitted"],
    ...leads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone ?? "",
      lead.leadMagnetTitle ?? "Untitled giveaway",
      formatSubmittedAt(lead.createdAt),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeLeadCsvValue).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "addlaunch-leads.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function Leads() {
  const [leadMagnetFilter, setLeadMagnetFilter] = useState("all");
  const { data: leads, isLoading, isError, refetch, isFetching } = useListLeads();

  const leadMagnets = useMemo(() => {
    const sources = new Map<number, string>();
    for (const lead of leads ?? []) {
      sources.set(lead.leadMagnetId, lead.leadMagnetTitle ?? "Untitled giveaway");
    }
    return [...sources.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [leads]);

  const visibleLeads = useMemo(
    () =>
      (leads ?? []).filter(
        (lead) => leadMagnetFilter === "all" || lead.leadMagnetId === Number(leadMagnetFilter),
      ),
    [leadMagnetFilter, leads],
  );

  const filtered = leadMagnetFilter !== "all";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Review everyone who has submitted one of your giveaway forms.
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={isLoading || visibleLeads.length === 0}
          onClick={() => downloadCsv(visibleLeads)}
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {filtered ? "Filtered leads" : "Total leads"}
              </p>
              {isLoading ? <Skeleton className="mt-1 h-8 w-12" /> : <p className="mt-1 text-3xl font-bold">{visibleLeads.length}</p>}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Giveaways with leads</p>
              {isLoading ? <Skeleton className="mt-1 h-8 w-12" /> : <p className="mt-1 text-3xl font-bold">{leadMagnets.length}</p>}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Giveaway submissions</h2>
              <p className="text-sm text-muted-foreground">Newest submissions appear first.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="lead-magnet-filter">Filter by giveaway</label>
              <select
                id="lead-magnet-filter"
                className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring sm:w-56"
                disabled={isLoading || leadMagnets.length === 0}
                value={leadMagnetFilter}
                onChange={(event) => setLeadMagnetFilter(event.target.value)}
              >
                <option value="all">All giveaways</option>
                {leadMagnets.map((leadMagnet) => (
                  <option key={leadMagnet.id} value={leadMagnet.id}>{leadMagnet.title}</option>
                ))}
              </select>
              <Button
                aria-label="Refresh leads"
                disabled={isFetching}
                onClick={() => refetch()}
                size="icon"
                title="Refresh leads"
                variant="outline"
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-12 w-full" key={index} />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Inbox className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Couldn’t load your leads</h3>
                <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
              </div>
              <Button onClick={() => refetch()} variant="outline">Try again</Button>
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{filtered ? "No leads for this giveaway" : "No leads yet"}</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {filtered
                    ? "Choose another giveaway to see its submissions."
                    : "When someone submits one of your giveaway forms, their details will appear here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Lead</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">Giveaway</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {visibleLeads.map((lead) => (
                    <tr className="transition-colors hover:bg-secondary/20" key={lead.id}>
                      <td className="px-5 py-4 font-medium text-foreground">{lead.name}</td>
                      <td className="px-5 py-4">
                        <div>{lead.email}</div>
                        {lead.phone && <div className="mt-0.5 text-muted-foreground">{lead.phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{lead.leadMagnetTitle ?? "Untitled giveaway"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatSubmittedAt(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}