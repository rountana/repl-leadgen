import { useState } from "react";
import { useLocation } from "wouter";
import { Link as LinkIcon, FileText, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateLeadMagnet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListLeadMagnetsQueryKey, getGetLeadMagnetsSummaryQueryKey } from "@workspace/api-client-react";

export function NewPath() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [url, setUrl] = useState("");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [showExistingPage, setShowExistingPage] = useState(false);
  
  const createLeadMagnet = useCreateLeadMagnet();

  const handleExistingUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    try {
      setIsSubmittingUrl(true);
      
      const magnet = await createLeadMagnet.mutateAsync({
        data: {
          type: 'existing_url',
          existingUrl: url,
          title: "My Existing Link",
        }
      });
      
      queryClient.invalidateQueries({ queryKey: getListLeadMagnetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadMagnetsSummaryQueryKey() });
      
      toast({
        title: "Link added!",
        description: "Your existing webpage has been added as a page.",
      });
      
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add your link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="mb-6 flex justify-start">
          <Button
            type="button"
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/dashboard")}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Recommended for capturing new leads
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Create your Give-Away Page</h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Turn your best resource into a high-converting page that captures leads for your business.
        </p>
      </div>

      <Card className="relative mx-auto flex max-w-2xl flex-col overflow-hidden border-2 border-primary/60 shadow-lg">
        <div className="absolute right-0 top-0 p-4">
          <div className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
            <CheckCircle2 className="h-3 w-3" /> Recommended
          </div>
        </div>
        <CardHeader className="pt-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Build a new lead magnet page</CardTitle>
          <CardDescription className="mt-2 text-base">
            Upload a PDF, pick a template, and create a custom landing page your next ad can send people to.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button onClick={() => setLocation("/create")} className="h-12 w-full text-lg shadow-md">
            Start Building <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      <div className="mx-auto mt-6 max-w-2xl text-center">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowExistingPage((current) => !current)}
          aria-expanded={showExistingPage}
          aria-controls="existing-page-form"
        >
          <LinkIcon className="h-4 w-4" />
          I already have a webpage
          {showExistingPage ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showExistingPage && (
          <Card id="existing-page-form" className="mt-4 text-left">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Add an existing webpage</CardTitle>
              <CardDescription>
                Paste the link to your current landing page or booking site to keep it in your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleExistingUrl} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Your webpage URL</Label>
                <Input 
                  id="url" 
                  placeholder="https://my-site.com/book" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  type="url"
                  className="h-12 text-base bg-secondary/30"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full text-lg h-12" disabled={isSubmittingUrl || !url}>
                {isSubmittingUrl ? "Saving..." : "Add Link"}
              </Button>
            </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
