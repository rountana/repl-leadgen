import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, AlertCircle, Loader2 } from "lucide-react";

const PUBLIC_LEAD_MAGNET_API = "/api/public/lead-magnets";

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
  ctaText: string | null;
  templateLayout: string | null;
  bgColor: string;
  fontColor: string;
  accentColor: string;
  fontFamily: string;
}

// ── SVG illustrations ──────────────────────────────────────────────────────

function GuideIllustration({ accent, fg }: { accent: string; fg: string }) {
  return (
    <svg viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto drop-shadow-xl">
      {/* Shadow blob */}
      <ellipse cx="210" cy="310" rx="130" ry="18" fill={accent} opacity="0.12" />

      {/* Back page */}
      <rect x="88" y="52" width="220" height="272" rx="14" fill="#e2e8f0" />

      {/* Main document */}
      <rect x="72" y="38" width="220" height="272" rx="14" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />

      {/* Header stripe */}
      <rect x="72" y="38" width="220" height="52" rx="14" fill={accent} />
      <rect x="72" y="76" width="220" height="14" fill={accent} />

      {/* Sparkle icon in header */}
      <g transform="translate(160, 58)">
        <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" fill="white" opacity="0.9" />
      </g>

      {/* Text lines */}
      <rect x="96" y="110" width="130" height="10" rx="5" fill={accent} opacity="0.25" />
      <rect x="96" y="128" width="172" height="7" rx="3.5" fill="#cbd5e1" />
      <rect x="96" y="142" width="158" height="7" rx="3.5" fill="#cbd5e1" />
      <rect x="96" y="156" width="165" height="7" rx="3.5" fill="#cbd5e1" />
      <rect x="96" y="170" width="140" height="7" rx="3.5" fill="#cbd5e1" />

      {/* Divider */}
      <rect x="96" y="192" width="172" height="1" fill="#e2e8f0" />

      {/* Bullet rows */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(96, ${208 + i * 22})`}>
          <circle cx="5" cy="5" r="5" fill={accent} opacity="0.7" />
          <rect x="16" y="1.5" width={90 + (i % 2) * 30} height="7" rx="3.5" fill="#cbd5e1" />
        </g>
      ))}

      {/* Lock badge */}
      <circle cx="292" cy="262" r="26" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <g transform="translate(280, 250)">
        <rect x="2" y="8" width="20" height="14" rx="3" fill={accent} />
        <path d="M6 8V6a6 6 0 0112 0v2" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
        <circle cx="12" cy="15" r="2" fill="white" />
      </g>

      {/* Floating sparkles */}
      <g opacity="0.8">
        <path d="M52 80 l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill={accent} opacity="0.6" />
        <path d="M346 120 l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill={accent} opacity="0.5" />
        <path d="M60 220 l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill={accent} opacity="0.4" />
        <path d="M358 210 l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill={accent} opacity="0.35" />
        <circle cx="342" cy="75" r="5" fill={accent} opacity="0.3" />
        <circle cx="58" cy="168" r="4" fill={accent} opacity="0.25" />
        <circle cx="370" cy="280" r="6" fill={accent} opacity="0.2" />
      </g>

      {/* Download arrow badge */}
      <circle cx="72" cy="262" r="26" fill={accent} />
      <g transform="translate(60, 250)" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v14M6 11l6 6 6-6" />
        <path d="M4 21h16" />
      </g>
    </svg>
  );
}

function SuccessIllustration({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 mx-auto mb-4">
      {/* Glow */}
      <ellipse cx="100" cy="155" rx="70" ry="12" fill={accent} opacity="0.1" />

      {/* Envelope body */}
      <rect x="30" y="65" width="140" height="90" rx="10" fill={accent} opacity="0.12" stroke={accent} strokeWidth="1.5" />

      {/* Envelope flap open */}
      <path d="M30 75 L100 115 L170 75" stroke={accent} strokeWidth="2" fill="none" strokeLinejoin="round" />

      {/* Document flying out */}
      <g transform="translate(65, 20) rotate(-8, 35, 50)">
        <rect x="0" y="0" width="70" height="88" rx="7" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="0" y="0" width="70" height="22" rx="7" fill={accent} />
        <rect x="0" y="14" width="70" height="8" fill={accent} />
        <rect x="10" y="32" width="50" height="5" rx="2.5" fill={accent} opacity="0.2" />
        <rect x="10" y="43" width="42" height="4" rx="2" fill="#e2e8f0" />
        <rect x="10" y="52" width="46" height="4" rx="2" fill="#e2e8f0" />
        <rect x="10" y="61" width="38" height="4" rx="2" fill="#e2e8f0" />
      </g>

      {/* Big checkmark circle */}
      <circle cx="148" cy="50" r="22" fill={accent} />
      <path d="M138 50 l7 7 13-14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Confetti dots */}
      {[
        [20, 30, accent, 0.7], [175, 25, "#f59e0b", 0.8], [15, 90, "#10b981", 0.6],
        [185, 95, accent, 0.5], [35, 145, "#f59e0b", 0.4], [165, 140, "#10b981", 0.5],
        [90, 15, accent, 0.4], [120, 12, "#f59e0b", 0.6],
      ].map(([cx, cy, fill, op], i) => (
        <circle key={i} cx={cx as number} cy={cy as number} r="5" fill={fill as string} opacity={op as number} />
      ))}

      {/* Confetti strips */}
      {[
        [22, 55, 10, 4, -20, accent, 0.5],
        [170, 60, 10, 4, 15, "#f59e0b", 0.5],
        [55, 150, 10, 4, -10, "#10b981", 0.4],
        [145, 148, 10, 4, 20, accent, 0.4],
      ].map(([x, y, w, h, rot, fill, op], i) => (
        <rect
          key={i}
          x={x as number} y={y as number}
          width={w as number} height={h as number}
          rx="2"
          fill={fill as string}
          opacity={op as number}
          transform={`rotate(${rot}, ${(x as number) + (w as number) / 2}, ${(y as number) + (h as number) / 2})`}
        />
      ))}
    </svg>
  );
}

function BackgroundDecor({ accent }: { accent: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="blob1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.12" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blob2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Top-right blob */}
      <ellipse cx="85%" cy="10%" rx="35%" ry="30%" fill="url(#blob1)" />
      {/* Bottom-left blob */}
      <ellipse cx="10%" cy="85%" rx="28%" ry="25%" fill="url(#blob2)" />
      {/* Subtle grid dots */}
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={`${col * 14 + 4}%`}
            cy={`${row * 20 + 5}%`}
            r="1.5"
            fill={accent}
            opacity="0.08"
          />
        ))
      )}
    </svg>
  );
}

// Custom trust-badge icons
function ShieldIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill={color} opacity="0.15" />
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="10" rx="3" fill={color} opacity="0.15" stroke={color} strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill={color} />
    </svg>
  );
}
function BoltIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z" fill={color} opacity="0.15" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

const TRUST_BADGES = [
  { label: "Instant access", Icon: BoltIcon },
  { label: "100% free", Icon: ShieldIcon },
  { label: "No spam, ever", Icon: LockIcon },
];

// ── Main component ─────────────────────────────────────────────────────────

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
    fetch(`${PUBLIC_LEAD_MAGNET_API}/${id}`)
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
      const res = await fetch(`${PUBLIC_LEAD_MAGNET_API}/${id}/leads`, {
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (notFound || !magnet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F8F7F4] px-4 text-center">
        <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none">
          <circle cx="40" cy="40" r="38" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M27 27l26 26M53 27L27 53" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
        <p className="text-slate-500 max-w-sm">This lead magnet page doesn't exist or hasn't been published yet.</p>
      </div>
    );
  }

  const bg = magnet.bgColor || "#ffffff";
  const fg = magnet.fontColor || "#1e1b4b";
  const accent = magnet.accentColor || "#4f46e5";
  const font = magnet.fontFamily || "'Plus Jakarta Sans', sans-serif";

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: bg, color: fg, fontFamily: font }}
    >
      {/* Decorative background SVG */}
      <BackgroundDecor accent={accent} />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
            style={{ backgroundColor: accent }}
          >
            {magnet.businessName?.[0]?.toUpperCase() ?? "H"}
          </div>
          <span className="font-semibold text-sm" style={{ color: fg }}>
            {magnet.businessName ?? "HVCG"}
          </span>
        </div>
        {magnet.businessLocation && (
          <div className="flex items-center gap-1.5 text-xs opacity-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            {magnet.businessLocation}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* Left — illustration + copy */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            {/* SVG illustration */}
            <div className="mb-8 w-full max-w-xs">
              <GuideIllustration accent={accent} fg={fg} />
            </div>

            {/* Label */}
            <div
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
              </svg>
              Free {magnet.giveawayFileName ? "Download" : "Guide"}
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-5" style={{ color: fg }}>
              {magnet.title ?? "Your Free Guide Is Waiting"}
            </h1>

            {/* Description */}
            {magnet.description && (
              <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: fg, opacity: 0.75 }}>
                {magnet.description}
              </p>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center md:justify-start gap-5">
              {TRUST_BADGES.map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-2 text-sm font-medium" style={{ opacity: 0.8 }}>
                  <Icon color={accent} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — form card */}
          <div>
            <div className="rounded-2xl p-8 shadow-2xl border border-black/5 bg-white">
              {submitted ? (
                // ── Success state ──
                <div className="text-center py-2">
                  <SuccessIllustration accent={accent} />
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">You're in! 🎉</h2>
                  <p className="text-slate-500 text-sm mb-7 max-w-xs mx-auto">
                    {fileUrl
                      ? "Your free resource is ready. Hit the button below to grab it."
                      : "Thanks for signing up! You'll hear from us very soon."}
                  </p>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      download={magnet.giveawayFileName ?? "download"}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-base shadow-lg transition-opacity hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: accent }}
                    >
                      <Download className="w-4 h-4" />
                      Download My Free Copy
                    </a>
                  )}

                  {/* Social share nudge */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-3">Know someone who'd benefit?</p>
                    <div className="flex justify-center gap-3">
                      {[
                        { label: "Facebook", color: "#1877F2", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
                        { label: "Twitter", color: "#1DA1F2", path: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" },
                        { label: "LinkedIn", color: "#0A66C2", path: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" },
                      ].map(({ label, color, path }) => (
                        <button
                          key={label}
                          aria-label={`Share on ${label}`}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
                            <path d={path} />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // ── Capture form ──
                <>
                  {/* Form header with icon */}
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}15` }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 leading-tight">Get instant access</h2>
                      <p className="text-slate-500 text-sm mt-0.5">
                        Enter your details to unlock your free {magnet.giveawayFileName ? "download" : "resource"}.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Name */}
                    <div>
                      <Label htmlFor="name" className="text-slate-700 font-medium text-sm">Full name</Label>
                      <div className="relative mt-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <Input id="name" placeholder="Jane Smith" className="pl-9 h-11" {...register("name")} />
                      </div>
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <Label htmlFor="email" className="text-slate-700 font-medium text-sm">Email address</Label>
                      <div className="relative mt-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                          </svg>
                        </div>
                        <Input id="email" type="email" placeholder="jane@example.com" className="pl-9 h-11" {...register("email")} />
                      </div>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone" className="text-slate-700 font-medium text-sm">
                        Phone <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      <div className="relative mt-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                          </svg>
                        </div>
                        <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="pl-9 h-11" {...register("phone")} />
                      </div>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {submitError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 text-base font-semibold text-white mt-1 shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: accent, border: "none" }}
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                      ) : (
                        <span className="flex items-center gap-2">
                          {magnet.ctaText || (magnet.giveawayFileName ? "Download Now" : "Get My Free Guide")}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      )}
                    </Button>

                    {/* Privacy line */}
                    <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                      <LockIcon color="#94a3b8" />
                      Your info is safe. We never sell or share it.
                    </p>
                  </form>
                </>
              )}
            </div>

            {/* Social proof below card */}
            {!submitted && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                  {["#6366f1","#f59e0b","#10b981"].map((c, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: c }}
                    >
                      {["J","M","A"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: fg, opacity: 0.55 }}>
                  Join hundreds who already grabbed this guide
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs" style={{ color: fg, opacity: 0.35 }}>
        Powered by HVCG
      </footer>
    </div>
  );
}
