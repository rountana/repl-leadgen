import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle, 
  Settings2, 
  Eye, 
  Loader2, 
  Palette, 
  Type, 
  Save,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetLeadMagnet, 
  useUpdateLeadMagnet, 
  useApproveLeadMagnet,
  useGetTemplate,
  useListTemplates,
  getGetLeadMagnetQueryKey,
  getGetTemplateQueryKey
} from "@workspace/api-client-react";

// Simple luminance calculation to check contrast roughly
function getLuminance(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1: number, l2: number) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function Review() {
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: magnet, isLoading } = useGetLeadMagnet(id);
  const { data: templates } = useListTemplates();
  const { data: template } = useGetTemplate(magnet?.templateId || 0, { 
    query: { 
      enabled: !!magnet?.templateId,
      queryKey: getGetTemplateQueryKey(magnet?.templateId || 0)
    } 
  });
  
  const updateMagnet = useUpdateLeadMagnet();
  const approveMagnet = useApproveLeadMagnet();

  // Local state for inline edits
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customBgColor, setCustomBgColor] = useState("#ffffff");
  const [customTextColor, setCustomTextColor] = useState("#1e293b");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Sync state once data is loaded
  const initializedRef = useRef(false);
  useEffect(() => {
    if (magnet && !initializedRef.current) {
      setTitle(magnet.title || "");
      setDescription(magnet.description || "");
      setSelectedTemplateId(magnet.templateId || undefined);
      if (magnet.customBgColor) setCustomBgColor(magnet.customBgColor);
      if (magnet.customTextColor) setCustomTextColor(magnet.customTextColor);
      initializedRef.current = true;
    }
  }, [magnet]);

  // Compute contrast warning
  const contrastWarning = useMemo(() => {
    if (!customBgColor.startsWith("#") || !customTextColor.startsWith("#")) return false;
    try {
      const lBg = getLuminance(customBgColor);
      const lText = getLuminance(customTextColor);
      const ratio = getContrastRatio(lBg, lText);
      return ratio < 4.5;
    } catch {
      return false;
    }
  }, [customBgColor, customTextColor]);

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      await updateMagnet.mutateAsync({
        id,
        data: {
          title,
          description,
          customBgColor,
          customTextColor,
          templateId: selectedTemplateId
        }
      });
      queryClient.setQueryData(getGetLeadMagnetQueryKey(id), (old: any) => 
        old ? { ...old, title, description, customBgColor, customTextColor, templateId: selectedTemplateId } : old
      );
      toast({ title: "Saved", description: "Changes updated in preview." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      // Save pending changes first
      await updateMagnet.mutateAsync({
        id,
        data: { title, description, customBgColor, customTextColor, templateId: selectedTemplateId }
      });
      // Approve
      await approveMagnet.mutateAsync({ id });
      
      toast({ title: "It's Live!", description: "Your lead magnet is now ready to share." });
      setLocation(`/live/${id}`);
    } catch (e) {
      toast({ title: "Approval Failed", description: "Something went wrong.", variant: "destructive" });
    }
  };

  if (isLoading || !magnet) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading your masterpiece...</p>
        </div>
      </div>
    );
  }

  // Determine actual display colors based on custom vs template defaults
  const currentTemplate = templates?.find(t => t.id === selectedTemplateId) || template;
  const previewBgColor = magnet.customBgColor || currentTemplate?.previewColor || "#f8fafc";
  const previewTextColor = magnet.customTextColor || "#0f172a";
  const previewAccentColor = currentTemplate?.accentColor || "#4f46e5";
  const previewFont = currentTemplate?.fontFamily || "sans-serif";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <button
            onClick={() => setLocation(`/create?id=${id}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Edit Content
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" /> Review & Fine-tune
          </h1>
          <p className="text-muted-foreground">Check how your page looks before going live.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve & Publish
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        
        {/* The Preview Mockup */}
        <div className="rounded-xl overflow-hidden shadow-2xl border-4 border-muted relative bg-white flex flex-col h-[700px] sticky top-24">
          {/* Browser Chrome Mock */}
          <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 text-center bg-white/50 rounded-md py-1 px-3 text-xs text-muted-foreground ml-4 mr-12 truncate font-mono">
              preview.hvcg.app/{magnet.id}
            </div>
          </div>
          
          {/* Preview Content Area */}
          <div 
            className="flex-1 overflow-y-auto p-8 md:p-12 flex items-center justify-center transition-colors duration-500"
            style={{ 
              backgroundColor: previewBgColor, 
              color: previewTextColor,
              fontFamily: previewFont
            }}
          >
            <div className="max-w-xl w-full text-center space-y-6">
              {magnet.businessName && (
                <div className="text-sm font-bold tracking-wider uppercase opacity-70 mb-8">
                  {magnet.businessName}
                </div>
              )}
              
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                {title || "Your amazing headline goes here"}
              </h2>
              
              <p className="text-lg md:text-xl opacity-90 leading-relaxed max-w-lg mx-auto">
                {description || "A compelling sub-headline that explains the value of what you are giving away."}
              </p>
              
              <div className="pt-8 max-w-sm mx-auto space-y-3">
                <input 
                  type="email" 
                  disabled
                  placeholder="Enter your email address" 
                  className="w-full px-4 py-3 rounded-md border-2 bg-white text-black"
                  style={{ borderColor: previewAccentColor + '40' }}
                />
                <button 
                  disabled
                  className="w-full px-4 py-4 rounded-md font-bold text-white transition-opacity shadow-lg"
                  style={{ backgroundColor: previewAccentColor }}
                >
                  {magnet.ctaText || "Get My Free Guide"}
                </button>
                <p className="text-xs opacity-60 mt-4">100% free. No spam ever.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="bg-card rounded-xl border shadow-sm flex flex-col h-auto">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> Editor
            </h3>
          </div>
          
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-none h-12 p-0 bg-transparent border-b">
              <TabsTrigger value="content" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                <Type className="w-4 h-4 mr-2" /> Content
              </TabsTrigger>
              <TabsTrigger value="style" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                <Palette className="w-4 h-4 mr-2" /> Style
              </TabsTrigger>
            </TabsList>
            
            <div className="p-6">
              <TabsContent value="content" className="m-0 space-y-5">
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="h-32 resize-none"
                  />
                </div>
                <Button variant="secondary" className="w-full" onClick={handleSaveDraft} disabled={isSaving}>
                  Apply Changes
                </Button>
              </TabsContent>
              
              <TabsContent value="style" className="m-0 space-y-6">
                
                <div className="space-y-3">
                  <Label>Template</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {templates?.map((t) => (
                      <div 
                        key={t.id}
                        className={`text-xs p-2 text-center rounded border cursor-pointer transition-all ${
                          selectedTemplateId === t.id ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => setSelectedTemplateId(t.id)}
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-3">
                    <Label className="flex justify-between items-center">
                      Background Color
                      <span className="text-xs text-muted-foreground font-mono">{customBgColor}</span>
                    </Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color" 
                        value={customBgColor} 
                        onChange={e => setCustomBgColor(e.target.value)}
                        className="w-12 h-12 p-1 cursor-pointer rounded-md"
                      />
                      <Input 
                        type="text" 
                        value={customBgColor} 
                        onChange={e => setCustomBgColor(e.target.value)}
                        className="font-mono uppercase flex-1 h-12"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="flex justify-between items-center">
                      Text Color
                      <span className="text-xs text-muted-foreground font-mono">{customTextColor}</span>
                    </Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color" 
                        value={customTextColor} 
                        onChange={e => setCustomTextColor(e.target.value)}
                        className="w-12 h-12 p-1 cursor-pointer rounded-md"
                      />
                      <Input 
                        type="text" 
                        value={customTextColor} 
                        onChange={e => setCustomTextColor(e.target.value)}
                        className="font-mono uppercase flex-1 h-12"
                      />
                    </div>
                  </div>
                  
                  {contrastWarning && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-sm flex gap-2 items-start mt-4">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <strong>Low Contrast Warning:</strong> 
                        <p className="mt-1 opacity-90">The text might be hard to read against this background. Try making the text darker or the background lighter.</p>
                      </div>
                    </div>
                  )}

                  <Button variant="secondary" className="w-full mt-4" onClick={handleSaveDraft} disabled={isSaving}>
                    Update Colors
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
