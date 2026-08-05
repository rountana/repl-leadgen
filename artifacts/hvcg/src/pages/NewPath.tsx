import { useState } from "react";
import { useLocation } from "wouter";
import { Link as LinkIcon, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
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
        description: "Your existing webpage has been added as a campaign.",
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
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">How do you want to capture leads?</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose whether you want to build a new high-converting giveaway page with us, or track an existing page you already have.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Option 1: Build a new one */}
        <Card className="relative overflow-hidden border-2 hover:border-primary transition-colors cursor-pointer group flex flex-col" onClick={() => setLocation("/create")}>
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3" /> Recommended
            </div>
          </div>
          <CardHeader className="pt-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create a Give-Away Page</CardTitle>
            <CardDescription className="text-base mt-2">
              Upload a PDF, pick a template, and we'll build a custom landing page for you in 60 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-6">
            <Button className="w-full text-lg h-12 shadow-md">
              Start Building <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Option 2: Existing URL */}
        <Card className="flex flex-col">
          <CardHeader className="pt-8">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
              <LinkIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">I already have a webpage</CardTitle>
            <CardDescription className="text-base mt-2">
              Paste the link to your existing landing page or booking site to add it to your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-6">
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
      </div>
    </div>
  );
}
