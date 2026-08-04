import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const captureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
});
type CaptureForm = z.infer<typeof captureSchema>;

interface PublicMagnet {
  id: number;
  title: string | null;
  description: string | null;
  businessName: string | null;
  businessLocation: string | null;
  giveawayFileName: string | null;
  templateLayout: string | null;
  bgColor: string;
  fontColor: string;
  accentColor: string;
  fontFamily: string;
}

export function PublicCapture() {
  const params = useParams();
  const id = params.id;

  const [magnet, setMagnet] = useState<PublicMagnet | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CaptureForm>({ resolver: zodResolver(captureSchema) });

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/public/lead-magnets/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setMagnet(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  const onSubmit = async (values: CaptureForm) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE}/api/public/lead-magnets/${id}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      setFileUrl(data.fileUrl ?? null);
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (notFound || !magnet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F8F7F4] px-4 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
        <p className="text-slate-500">This lead magnet page doesn't exist or hasn't been published yet.</p>
      </div>
    );
  }

  const bg = magnet.bgColor || "#ffffff";
  const fg = magnet.fontColor || "#1e1b4b";
  const accent = magnet.accentColor || "#4f46e5";
  const font = magnet.fontFamily || "'Plus Jakarta Sans', sans-serif";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bg, color: fg, fontFamily: font }}
    >
      {/* Header bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: accent }}
          >
            {magnet.businessName?.[0]?.toUpperCase() ?? "H"}
          </div>
          <span className="font-semibold text-sm" style={{ color: fg }}>
            {magnet.businessName ?? "HVCG"}
          </span>
        </div>
        {magnet.businessLocation && (
          <span className="text-xs opacity-60">{magnet.businessLocation}</span>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
          {/* Left — teaser copy */}
          <div>
            <div
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6"
              style={{ backgroundColor: `${accent}20`, color: accent }}
            >
              Free {magnet.giveawayFileName ? "Download" : "Guide"}
            </div>

            <h1
              className="text-4xl md:text-5xl font-extrabold leading-tight mb-6"
              style={{ color: fg }}
            >
              {magnet.title ?? "Exclusive Free Guide"}
            </h1>

            {magnet.description && (
              <p className="text-lg leading-relaxed opacity-80 mb-8" style={{ color: fg }}>
                {magnet.description}
              </p>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4">
              {["Instant access", "100% free", "No spam ever"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5 text-sm opacity-70">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — capture form card */}
          <div>
            <div
              className="rounded-2xl p-8 shadow-2xl border border-black/5"
              style={{ backgroundColor: "#ffffff" }}
            >
              {submitted ? (
                <div className="text-center py-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${accent}15` }}
                  >
                    <CheckCircle2 className="w-8 h-8" style={{ color: accent }} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">You're in!</h2>
                  <p className="text-slate-500 text-sm mb-6">
                    {fileUrl
                      ? "Click below to download your free resource."
                      : "Thanks for signing up! You'll receive access shortly."}
                  </p>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      download={magnet.giveawayFileName ?? "download"}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
                      style={{ backgroundColor: accent }}
                    >
                      <Download className="w-4 h-4" />
                      Download Now
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">
                    Get instant access
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">
                    Enter your details below to unlock your free {magnet.giveawayFileName ? "download" : "resource"}.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-slate-700 font-medium text-sm">
                        Full name
                      </Label>
                      <Input
                        id="name"
                        placeholder="Jane Smith"
                        className="mt-1"
                        {...register("name")}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
                        Email address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@example.com"
                        className="mt-1"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-slate-700 font-medium text-sm">
                        Phone <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="mt-1"
                        {...register("phone")}
                      />
                    </div>

                    {submitError && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {submitError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 text-base font-semibold text-white mt-2 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: accent, border: "none" }}
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                      ) : (
                        <>Get Free Access <Download className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>

                    <p className="text-xs text-slate-400 text-center">
                      We respect your privacy. No spam, ever.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs opacity-40" style={{ color: fg }}>
        Powered by HVCG
      </div>
    </div>
  );
}
