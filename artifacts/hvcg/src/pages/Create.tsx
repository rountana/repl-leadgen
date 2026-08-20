import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UploadCloud, Wand2, ArrowRight, ArrowLeft, Loader2, Search, ImageIcon, LayoutTemplate, FileText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import { 
  useCreateLeadMagnet,
  useUpdateLeadMagnet,
  useGetLeadMagnet,
  getGetLeadMagnetQueryKey,
  useUploadLeadMagnetFile, 
  useListTemplates,
  useListExamples,
  useListIndustries,
  useGetProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";

const CTA_PRESETS = [
  "Get My Free Guide",
  "Send It to Me",
  "Download Now",
  "Claim My Copy",
  "Yes, I Want This!",
  "Get Instant Access",
];

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  businessName: z.string().min(2, "Business name is required"),
  businessLocation: z.string().optional(),
  templateId: z.coerce.number().min(1, "Please select a template"),
  ctaText: z.string().min(1, "Please choose a call-to-action"),
});

export function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Edit mode: read ?id= from URL
  const editId = (() => {
    const raw = new URLSearchParams(window.location.search).get("id");
    return raw ? parseInt(raw, 10) : null;
  })();
  const isEditMode = editId !== null;

  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createLeadMagnet = useCreateLeadMagnet();
  const updateLeadMagnet = useUpdateLeadMagnet();
  const uploadFile = useUploadLeadMagnetFile();
  const { data: templates } = useListTemplates();
  const { data: industries } = useListIndustries();
  const { data: existingMagnet } = useGetLeadMagnet(editId ?? 0, {
    query: { queryKey: getGetLeadMagnetQueryKey(editId ?? 0), enabled: isEditMode && editId !== null },
  });

  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), staleTime: 60_000 },
  });

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
      ctaText: CTA_PRESETS[0],
    },
  });

  // Pre-populate from business profile when creating a new magnet
  const profileApplied = useRef(false);
  useEffect(() => {
    if (!profile || profileApplied.current || isEditMode) return;
    profileApplied.current = true;
    if (profile.businessName) form.setValue("businessName", profile.businessName);
    if (profile.businessLocation) form.setValue("businessLocation", profile.businessLocation);
  }, [profile, isEditMode]);

  // Pre-populate form when editing an existing lead magnet
  useEffect(() => {
    if (existingMagnet && isEditMode) {
      const cta = existingMagnet.ctaText ?? CTA_PRESETS[0];
      form.reset({
        title: existingMagnet.title ?? "",
        description: existingMagnet.description ?? "",
        businessName: existingMagnet.businessName ?? "",
        businessLocation: existingMagnet.businessLocation ?? "",
        templateId: existingMagnet.templateId ?? undefined,
        ctaText: cta,
      });
    }
  }, [existingMagnet, isEditMode]);

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
      let magnetId: number;

      if (isEditMode && editId) {
        // Update existing lead magnet
        await updateLeadMagnet.mutateAsync({
          id: editId,
          data: {
            title: values.title,
            description: values.description,
            businessName: values.businessName,
            businessLocation: values.businessLocation,
            templateId: values.templateId,
            ctaText: values.ctaText,
          },
        });
        magnetId = editId;
      } else {
        // Create new lead magnet
        const magnet = await createLeadMagnet.mutateAsync({
          data: {
            type: "give_away",
            title: values.title,
            description: values.description,
            businessName: values.businessName,
            businessLocation: values.businessLocation,
            templateId: values.templateId,
          },
        });
        // Save ctaText on the newly created magnet
        await updateLeadMagnet.mutateAsync({
          id: magnet.id,
          data: { ctaText: values.ctaText },
        });
        magnetId = magnet.id;
      }

      // Upload file if a new one was selected
      if (file && fileDataUrl) {
        await uploadFile.mutateAsync({
          id: magnetId,
          data: { fileName: file.name, fileDataUrl },
        });
      }

      toast({ title: isEditMode ? "Updated!" : "Success!", description: "Your lead magnet is ready for review." });
      setLocation(`/review/${magnetId}`);
    } catch {
      toast({ title: "Error", description: `Failed to ${isEditMode ? "update" : "create"} lead magnet.`, variant: "destructive" });
    }
  };

  const isSubmitting = createLeadMagnet.isPending || updateLeadMagnet.isPending || uploadFile.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <button
          onClick={() => setLocation(isEditMode ? `/review/${editId}` : "/new")}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {isEditMode ? "Back to Review" : "Back"}
        </button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditMode ? "Edit Page" : "Create your Give-Away Page"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isEditMode
            ? "Update your content and template, then return to review."
            : "Fill in the details below. Our system will generate a beautiful landing page."}
        </p>
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

          {/* AI Helpers */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border border-border/50 bg-secondary/20 shadow-sm">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1"><Wand2 className="w-5 h-5 text-indigo-500/70" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">Auto-fill from website</h4>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Coming soon
                      </span>
                    </div>
                    <Switch checked={false} disabled aria-label="Auto-fill from website coming soon" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Extract details from your existing site automatically.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-border/50 bg-secondary/20 shadow-sm">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1"><ImageIcon className="w-5 h-5 text-indigo-500/70" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">Extract logo &amp; colors</h4>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Coming soon
                      </span>
                    </div>
                    <Switch checked={false} disabled aria-label="Extract logo and colors coming soon" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pull your brand identity automatically.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold text-lg flex items-center justify-between">
              Content Details
              
              <Dialog>
                <TooltipProvider delayDuration={250}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-9 gap-1.5 px-3 text-xs font-semibold shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Browse Inspiration
                          <Search className="w-3 h-3 opacity-80" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                      See proven lead magnet ideas and use one to fill in your title and description faster.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                        variant={selectedIndustry === ind.name ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setSelectedIndustry(ind.name)}
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
                  <FormLabel>Lead Magnet Title</FormLabel>
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

            <FormField
              control={form.control}
              name="ctaText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call-to-Action Button</FormLabel>
                  <FormDescription>What should the button on your capture page say?</FormDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CTA_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => field.onChange(preset)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          field.value === preset
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (CTA_PRESETS.includes(field.value)) field.onChange("");
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        !CTA_PRESETS.includes(field.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      ✏️ Custom
                    </button>
                  </div>
                  {!CTA_PRESETS.includes(field.value) && (
                    <FormControl>
                      <Input
                        placeholder="e.g. Get My Free Checklist"
                        className="mt-2 h-11"
                        value={field.value}
                        onChange={field.onChange}
                        autoFocus
                      />
                    </FormControl>
                  )}
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
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {isEditMode ? "Saving..." : "Building..."}</>
              ) : isEditMode ? (
                <>Save & Review <ArrowRight className="w-5 h-5 ml-2" /></>
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
