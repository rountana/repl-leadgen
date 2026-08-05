import { useParams, useLocation } from "wouter";
import { Copy, ExternalLink, ArrowRight, ArrowLeft, PartyPopper, CheckCircle2, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGetLeadMagnet } from "@workspace/api-client-react";

export function Live() {
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: magnet, isLoading } = useGetLeadMagnet(id);

  const handleCopy = () => {
    if (magnet?.shareUrl) {
      navigator.clipboard.writeText(magnet.shareUrl);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    }
  };

  if (isLoading || !magnet) return null;

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
      
      <div className="mb-8 flex justify-center">
        <div className="relative">
          <div className="absolute -inset-4 bg-green-500/20 blur-xl rounded-full animate-pulse" />
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white relative shadow-xl transform hover:scale-110 transition-transform cursor-default">
            <PartyPopper className="w-12 h-12" />
          </div>
        </div>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
        You're Live!
      </h1>
      
      <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
        Your lead magnet page is published and ready to start capturing emails. Share this link everywhere.
      </p>

      <Card className="border-2 shadow-lg mb-12 overflow-hidden bg-gradient-to-b from-white to-secondary/20">
        <CardContent className="p-8 md:p-12">
          
          <div className="flex items-center justify-center mb-6">
            <span className="bg-green-100 text-green-800 font-bold px-4 py-1.5 rounded-full text-sm flex items-center shadow-sm">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Live Status: Active
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <Input 
              value={magnet.shareUrl || "https://hvcg.app/m/placeholder"} 
              readOnly 
              className="h-14 text-base md:text-lg text-center sm:text-left font-medium bg-white"
            />
            <Button size="lg" onClick={handleCopy} className="h-14 px-8 text-lg shadow-md shrink-0">
              <Copy className="w-5 h-5 mr-2" /> Copy
            </Button>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border flex flex-col items-center">
            <p className="text-sm font-semibold text-muted-foreground mb-4 flex items-center uppercase tracking-wider">
              <Share2 className="w-4 h-4 mr-2" /> Share on Socials
            </p>
            <div className="flex gap-4">
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-none">
                <Facebook className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white border-none">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white border-none">
                <Linkedin className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button variant="outline" size="lg" asChild className="h-14 px-8">
          <a href={magnet.shareUrl || "#"} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-5 h-5 mr-2" /> Open live page
          </a>
        </Button>
        <Button variant="outline" size="lg" onClick={() => setLocation(`/review/${id}`)} className="h-14 px-8">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Edit
        </Button>
        <Button size="lg" onClick={() => setLocation("/dashboard")} className="h-14 px-8 bg-slate-900 hover:bg-slate-800">
          Dashboard <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

    </div>
  );
}
