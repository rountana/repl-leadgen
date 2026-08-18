import { useState, useRef, useEffect } from "react";
import { Building2, MapPin, Briefcase, Upload, X, Check, Loader2, Info, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetProfile,
  useUpdateProfile,
  useListIndustries,
  getGetProfileQueryKey,
  getListIndustriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";

export function Profile() {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const search = useSearch();
  const returnTo = new URLSearchParams(search).get("returnTo") ?? null;

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const { data: industries = [] } = useListIndustries({
    query: { queryKey: getListIndustriesQueryKey() },
  });
  const updateProfile = useUpdateProfile();

  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [industryIsOther, setIndustryIsOther] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (!profile) return;
    setBusinessName(profile.businessName ?? "");
    setBusinessLocation(profile.businessLocation ?? "");
    setLogoUrl(profile.logoUrl ?? "");
    setIndustry(profile.industry ?? "");
  }, [profile]);

  // Once both profile and industries list are loaded, detect "other" industry
  useEffect(() => {
    if (!profile?.industry || !industries.length) return;
    if (!industries.some((ind) => ind.name === profile.industry)) {
      setIndustryIsOther(true);
    }
  }, [profile, industries]);

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "__other__") {
      setIndustryIsOther(true);
      setIndustry("");
    } else {
      setIndustryIsOther(false);
      setIndustry(e.target.value);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    const result = await updateProfile.mutateAsync({
      data: {
        businessName: businessName || null,
        businessLocation: businessLocation || null,
        industry: industry || null,
        logoUrl: logoUrl || null,
      },
    });
    setAddressWarning(result.addressWarning ?? null);
    queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const logoInitial = businessName?.[0]?.toUpperCase() || "?";

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 max-w-2xl flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        {returnTo && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2 mb-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(returnTo)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ad builder
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Business Profile</h1>
        <p className="text-muted-foreground mt-1">
          Save your business details once — they'll be pre-filled in every new ad.
        </p>
      </div>

      {/* Auto-populated notice */}
      {profile && (profile.businessName || profile.businessLocation) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            We pre-filled some fields from your Facebook connection. Update anything that doesn't look right and hit Save.
          </p>
        </div>
      )}

      {/* Logo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Logo</CardTitle>
          <CardDescription>
            Shown as a reference when building ads. PNG or JPG under 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 border-2 border-border flex items-center justify-center text-primary font-bold text-2xl">
              {logoUrl ? (
                <img src={logoUrl} alt="Business logo" className="w-full h-full object-cover" />
              ) : (
                <span>{logoInitial}</span>
              )}
            </div>
            {logoUrl && (
              <button
                onClick={() => setLogoUrl("")}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              {logoUrl ? "Change logo" : "Upload logo"}
            </Button>
            {logoUrl && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Logo set
              </p>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bizName" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Business name
            </Label>
            <Input
              id="bizName"
              placeholder="e.g. Acme HVAC"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              City / area
            </Label>
            <Input
              id="location"
              placeholder="e.g. Austin, TX"
              value={businessLocation}
              onChange={(e) => {
                setBusinessLocation(e.target.value);
                setAddressWarning(null);
              }}
            />
            {addressWarning && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs">{addressWarning}</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry" className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              Industry
            </Label>
            <select
              id="industry"
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={industryIsOther ? "__other__" : industry}
              onChange={handleIndustryChange}
            >
              <option value="">Select your industry…</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.name}>{ind.name}</option>
              ))}
              <option value="__other__">Other…</option>
            </select>
            {industryIsOther && (
              <Input
                placeholder="Describe your industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="gap-2"
        >
          {updateProfile.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            "Save Profile"
          )}
        </Button>
        {saved && (
          <Badge className="gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            <Check className="w-3 h-3" /> Saved
          </Badge>
        )}
        {updateProfile.isError && (
          <p className="text-sm text-destructive">Save failed — please try again.</p>
        )}
      </div>
    </div>
  );
}
