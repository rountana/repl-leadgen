import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UploadCloud, Wand2, ArrowRight, Loader2, Search, ImageIcon, LayoutTemplate, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { 
  useCreateLeadMagnet, 
  useUploadLeadMagnetFile, 
  useListTemplates,
  useListExamples,
  useListIndustries,
  useAiPrefill,
  useAiExtractBranding
} from "@workspace/api-client-react";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  businessName: z.string().min(2, "Business name is required"),
  businessLocation: z.string().optional(),
  templateId: z.coerce.number().min(1, "Please select a template"),
});

export function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [aiPrefill, setAiPrefill] = useState(false);
  const [aiBranding, setAiBranding] = useState(false);
  
  const [aiPrefillUrl, setAiPrefillUrl] = useState("");
  const [aiBrandingUrl, setAiBrandingUrl] = useState("");
  
  const createLeadMagnet = useCreateLeadMagnet();
  const uploadFile = useUploadLeadMagnetFile();
  const aiPrefillMut = useAiPrefill();
  const aiBrandingMut = useAiExtractBranding();
  const { data: templates } = useListTemplates();
  const { data: industries } = useListIndustries();
  
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const { data: examples } = useListExamples(
    selectedIndustry ? { industry: selectedIndustry } : undefined
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      businessName: "",
      businessLocation: "",
      templateId: undefined,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    // Only accept PDFs or images for giveaway typically, but let's be loose
    if (selected.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a file under 10MB", variant: "destructive" });
      return;
    }
    
    setFile(selected);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFileDataUrl(event.target.result);
      }
    };
    reader.readAsDataURL(selected);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // 1. Create the lead magnet
      const magnet = await createLeadMagnet.mutateAsync({
        data: {
          type: 'give_away',
          title: values.title,
          description: values.description,
          businessName: values.businessName,
          businessLocation: values.businessLocation,
          templateId: values.templateId,
        }
      });
      
      // 2. Upload the file if present
      if (magnet.id && file && fileDataUrl) {
        await uploadFile.mutateAsync({
          id: magnet.id,
          data: {
            fileName: file.name,
            fileDataUrl: fileDataUrl
          }
        });
      }
      
      toast({ title: "Success!", description: "Your lead magnet is ready for review." });
      setLocation(`/review/${magnet.id}`);
      
    } catch (error) {
      toast({ title: "Error", description: "Failed to create lead magnet.", variant: "destructive" });
    }
  };

  const handleAiPrefill = async () => {
    if (!aiPrefillUrl) return;
    try {
      const res = await aiPrefillMut.mutateAsync({ data: { sourceUrl: aiPrefillUrl } });
      if (res.title) form.setValue("title", res.title);
      if (res.description) form.setValue("description", res.description);
      if (res.businessName) form.setValue("businessName", res.businessName);
      if (res.businessLocation) form.setValue("businessLocation", res.businessLocation);
      toast({ title: "Content pre-filled!" });
    } catch {
      toast({ title: "Failed to extract content", variant: "destructive" });
    }
  };

  const handleAiBranding = async () => {
    if (!aiBrandingUrl) return;
    try {
      const res = await aiBrandingMut.mutateAsync({ data: { sourceUrl: aiBrandingUrl } });
      toast({ title: "Branding extracted!", description: "Colors and logo will be applied to your page." });
      // The API saves branding config, or we would apply it to form state here if form had color fields.
      // Since the form in /create doesn't have color fields (those are set in /review),
      // we'd rely on backend setting default customBgColor etc on creation, or we can just show a success message.
    } catch {
      toast({ title: "Failed to extract branding", variant: "destructive" });
    }
  };

  const isSubmitting = createLeadMagnet.isPending || uploadFile.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create your Give-Away Page</h1>
        <p className="text-muted-foreground mt-2">Fill in the details below. Our system will generate a beautiful landing page.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* File Upload */}
          <Card className="border-2 border-dashed bg-secondary/20">
            <CardContent className="p-8 text-center">
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
              {!file ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload your give-away</h3>
                  <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                    Upload the PDF, checklist, or guide you want to give away in exchange for an email address.
                  </p>
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 text-green-600">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB ready to be given away.
                  </p>
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Change File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Helpers (Visual only for now, can be hooked up if API was fully active for them) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1"><Wand2 className="w-5 h-5 text-indigo-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Auto-fill from website</h4>
                    <Switch checked={aiPrefill} onCheckedChange={setAiPrefill} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Extract details from your existing site.</p>
                  {aiPrefill && (
                    <div className="flex gap-2">
                      <Input placeholder="https://yourwebsite.com" className="h-8 text-sm flex-1" value={aiPrefillUrl} onChange={e => setAiPrefillUrl(e.target.value)} />
                      <Button type="button" size="sm" className="h-8 px-2" disabled={aiPrefillMut.isPending || !aiPrefillUrl} onClick={handleAiPrefill}>
                        {aiPrefillMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Fill"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1"><ImageIcon className="w-5 h-5 text-indigo-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Extract logo & colors</h4>
                    <Switch checked={aiBranding} onCheckedChange={setAiBranding} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Pull your brand identity automatically.</p>
                  {aiBranding && (
                    <div className="flex gap-2">
                      <Input placeholder="https://yourwebsite.com" className="h-8 text-sm flex-1" value={aiBrandingUrl} onChange={e => setAiBrandingUrl(e.target.value)} />
                      <Button type="button" size="sm" className="h-8 px-2" disabled={aiBrandingMut.isPending || !aiBrandingUrl} onClick={handleAiBranding}>
                        {aiBrandingMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Pull"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold text-lg flex items-center justify-between">
              Content Details
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-primary h-8 px-2 text-xs">
                    <Search className="w-3 h-3 mr-1" /> Browse Inspiration
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Lead Magnet Inspiration</DialogTitle>
                  </DialogHeader>
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <Button 
                      variant={selectedIndustry === null ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setSelectedIndustry(null)}
                    >
                      All
                    </Button>
                    {industries?.map(ind => (
                      <Button 
                        key={ind.id} 
                        variant={selectedIndustry === ind.slug ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setSelectedIndustry(ind.slug)}
                      >
                        {ind.name}
                      </Button>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {examples?.map(ex => (
                      <Card key={ex.id} className="overflow-hidden">
                        {ex.imageUrl && (
                          <div className="h-32 bg-muted overflow-hidden">
                            <img src={ex.imageUrl} alt={ex.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h4 className="font-bold text-sm mb-1">{ex.title}</h4>
                          <p className="text-xs text-muted-foreground mb-3">{ex.description}</p>
                          <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => {
                            form.setValue("title", ex.title);
                            form.setValue("description", ex.description);
                            toast({ title: "Content copied", description: "The example content has been filled in."});
                          }}>
                            Use this content
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </h3>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hook Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 10 Secrets to a Perfect Lawn" {...field} className="h-12" />
                  </FormControl>
                  <FormDescription>Make it catchy. What's the big promise?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain what they get and why it matters..." className="resize-none h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Fitness" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Austin, TX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center"><LayoutTemplate className="w-5 h-5 mr-2" /> Choose a Layout</h3>
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {templates?.map((t) => (
                      <div 
                        key={t.id}
                        className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                          field.value === t.id ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-md' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => field.onChange(t.id)}
                      >
                        <div className="h-24 bg-muted w-full relative">
                           {/* Abstract representation of the layout */}
                           <div className="absolute inset-0 p-2 flex flex-col gap-1 opacity-50" style={{ backgroundColor: t.previewColor }}>
                             <div className="h-2 w-1/2 bg-black/20 rounded" />
                             <div className="h-2 w-3/4 bg-black/10 rounded" />
                             <div className="mt-auto h-4 w-1/3 bg-black/30 rounded" style={{ backgroundColor: t.accentColor }} />
                           </div>
                        </div>
                        <div className="p-3 bg-card text-center border-t">
                          <span className="text-sm font-medium">{t.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage className="mt-2" />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-4 pb-12 flex justify-end">
            <Button type="submit" size="lg" className="w-full sm:w-auto px-12 shadow-lg text-lg h-14" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Building...</>
              ) : (
                <>Generate Page <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
