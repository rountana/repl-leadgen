/**
 * FB Ad Generator — produces headline (≤40 chars) and body copy (≤90 chars)
 * from business fields, plus a stock image URL matched to the industry.
 */

export interface AdGenerationInput {
  businessName: string;
  industry: string;
  location: string;
  offer: string;
}

export interface AdDraft {
  headline: string;
  bodyText: string;
  imageUrl: string;
}

/** Curated royalty-free stock image URLs keyed by industry slug. */
const INDUSTRY_IMAGES: Record<string, string> = {
  restaurant:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
  fitness:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
  beauty:
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80",
  realestate:
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
  automotive:
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80",
  dental:
    "https://images.unsplash.com/photo-1588776814546-1ffbb2c3d8b1?w=1200&q=80",
  home_services:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
  education:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
  healthcare:
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80",
  retail:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80";

function pickImage(industry: string): string {
  const slug = industry.toLowerCase().replace(/[\s-]+/g, "_");
  return INDUSTRY_IMAGES[slug] ?? DEFAULT_IMAGE;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Generate an ad draft from business fields.
 * Uses a simple template system — no external AI call required.
 */
export function generateFbAd(input: AdGenerationInput): AdDraft {
  const { businessName, location, offer } = input;

  // Headline: ≤40 chars
  const rawHeadline = `${businessName} — ${offer}`;
  const headline = truncate(rawHeadline, 40);

  // Body: ≤90 chars
  const rawBody = `${offer} at ${businessName} in ${location}. Limited time — claim yours today!`;
  const bodyText = truncate(rawBody, 90);

  const imageUrl = pickImage(input.industry);

  return { headline, bodyText, imageUrl };
}
