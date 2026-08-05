import { Link, useLocation } from "wouter";
import { Plus, LayoutTemplate, Link as LinkIcon, BarChart3, Clock, CheckCircle2, MoreHorizontal, Copy, ExternalLink, ArrowRight, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useListLeadMagnets, useGetLeadMagnetsSummary, getGetLeadMagnetsSummaryQueryKey, getListLeadMagnetsQueryKey } from "@workspace/api-client-react";

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: summary, isLoading: isLoadingSummary } = useGetLeadMagnetsSummary({
    query: { queryKey: getGetLeadMagnetsSummaryQueryKey() }
  });
  
  const { data: leadMagnets, isLoading: isLoadingList } = useListLeadMagnets({
    query: { queryKey: getListLeadMagnetsQueryKey() }
  });

  const handleCopyLink = (url?: string | null) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "The share link has been copied to your clipboard.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white border-transparent"><CheckCircle2 className="w-3 h-3 mr-1" /> Live</Badge>;
      case 'review':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"><Clock className="w-3 h-3 mr-1" /> In Review</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><LayoutTemplate className="w-3 h-3 mr-1" /> Draft</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your lead magnets and track performance.</p>
        </div>
        <Button onClick={() => setLocation("/new")} size="lg" className="shadow-md">
          <Plus className="w-5 h-5 mr-2" />
          Create New Campaign
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { title: "Total Campaigns", value: summary?.total ?? 0, icon: <BarChart3 className="w-5 h-5 text-primary" />, color: "bg-primary/10" },
          { title: "Live", value: summary?.live ?? 0, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, color: "bg-green-500/10" },
          { title: "Needs Review", value: summary?.review ?? 0, icon: <Clock className="w-5 h-5 text-amber-500" />, color: "bg-amber-500/10" },
          { title: "Drafts", value: summary?.draft ?? 0, icon: <LayoutTemplate className="w-5 h-5 text-muted-foreground" />, color: "bg-secondary" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        
        {isLoadingList ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="mb-4">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="space-y-3 w-full max-w-md">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-10 w-24" />
              </CardContent>
            </Card>
          ))
        ) : leadMagnets?.length === 0 ? (
          <Card className="bg-secondary/30 border-dashed border-2 py-16 text-center">
            <CardContent className="flex flex-col items-center justify-center p-0">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MousePointer2 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Create your first lead magnet to start capturing emails and growing your audience.
              </p>
              <Button onClick={() => setLocation("/new")} size="lg">
                Create your first Lead Magnet <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {leadMagnets?.map((magnet) => (
              <Card key={magnet.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <div className="flex flex-col sm:flex-row">
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(magnet.status)}
                      <span className="text-xs text-muted-foreground flex items-center">
                        {magnet.type === 'existing_url' ? <LinkIcon className="w-3 h-3 mr-1" /> : <LayoutTemplate className="w-3 h-3 mr-1" />}
                        {magnet.type === 'existing_url' ? 'External Link' : 'Give-Away Page'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{magnet.title || "Untitled Campaign"}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {magnet.description || "No description provided."}
                    </p>
                  </div>
                  
                  <div className="bg-secondary/20 p-6 sm:w-64 flex flex-col justify-center sm:border-l border-t sm:border-t-0 border-border/50 gap-3">
                    {magnet.status === 'live' && magnet.shareUrl ? (
                      <>
                        <Button 
                          variant="default" 
                          className="w-full justify-between"
                          onClick={() => handleCopyLink(magnet.shareUrl)}
                        >
                          Copy Link <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between bg-white"
                          asChild
                        >
                          <a href={magnet.shareUrl} target="_blank" rel="noopener noreferrer">
                            Visit Live <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </>
                    ) : magnet.status === 'review' ? (
                      <Button 
                        variant="default" 
                        className="w-full justify-between bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => setLocation(`/review/${magnet.id}`)}
                      >
                        Review Now <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary" 
                        className="w-full justify-between"
                        onClick={() => setLocation(magnet.type === 'existing_url' ? '#' : `/review/${magnet.id}`)}
                      >
                        Continue Editing <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
