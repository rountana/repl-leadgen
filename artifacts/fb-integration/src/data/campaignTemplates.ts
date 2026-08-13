/**
 * Pre-built campaign templates for common small business categories.
 * Images sourced from Unsplash (unsplash.com) — free to use under the Unsplash License.
 * Attribution is shown in the template picker.
 */

export interface CampaignTemplate {
  id: string;
  /** Matches the slug used by the Profile industry list. */
  industrySlug: string;
  category: string;
  emoji: string;
  name: string;
  headline: string;
  bodyText: string;
  /** Unsplash CDN URL — auto-format, cropped to 1200×628 (standard ad size) */
  imageUrl: string;
  /** "Photographer Name" for attribution */
  photoCredit: string;
  /** Suggested daily budget in dollars */
  suggestedBudget: number;
  /** Suggested targeting radius in miles */
  suggestedRadius: number;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=628&q=80`;

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "restaurant",
    industrySlug: "food-restaurant",
    category: "Food & Restaurant",
    emoji: "🍽️",
    name: "Dine With Us",
    headline: "Taste the Difference Today",
    bodyText:
      "Join us for an unforgettable dining experience. Fresh ingredients, bold flavors, and a warm atmosphere you'll love. Reserve your table now!",
    imageUrl: unsplash("photo-1546069901-ba9599a7e63c"),
    photoCredit: "Unsplash",
    suggestedBudget: 15,
    suggestedRadius: 5,
  },
  {
    id: "fitness",
    industrySlug: "fitness-wellness",
    category: "Fitness & Wellness",
    emoji: "💪",
    name: "Transform Your Body",
    headline: "Start Your Fitness Journey Today",
    bodyText:
      "Expert trainers, modern equipment, and a community that keeps you motivated. Your first week is completely free — come see what you've been missing.",
    imageUrl: unsplash("photo-1534438327276-14e5300c3a48"),
    photoCredit: "Unsplash",
    suggestedBudget: 20,
    suggestedRadius: 8,
  },
  {
    id: "salon",
    industrySlug: "beauty-salon",
    category: "Beauty & Salon",
    emoji: "✂️",
    name: "Look Your Best",
    headline: "Book Your Glow-Up Today",
    bodyText:
      "Professional hair, skin, and nail services tailored just for you. New clients receive 20% off their first visit. Book online in seconds!",
    imageUrl: unsplash("photo-1560066984-138dadb4c035"),
    photoCredit: "Unsplash",
    suggestedBudget: 12,
    suggestedRadius: 5,
  },
  {
    id: "real-estate",
    industrySlug: "real-estate",
    category: "Real Estate",
    emoji: "🏡",
    name: "Find Your Dream Home",
    headline: "Your Dream Home Is Waiting",
    bodyText:
      "Discover beautiful homes in your neighborhood. Our experienced agents guide you every step of the way — from first showing to closing day.",
    imageUrl: unsplash("photo-1568605114967-8130f3a36994"),
    photoCredit: "Unsplash",
    suggestedBudget: 25,
    suggestedRadius: 15,
  },
  {
    id: "home-services",
    industrySlug: "home-services",
    category: "Home Services",
    emoji: "🔧",
    name: "Fast & Reliable Repairs",
    headline: "Quality Home Repairs, Done Right",
    bodyText:
      "Licensed, insured, and available 7 days a week. Get a free estimate and same-day service for urgent repairs. Trusted by hundreds of local homeowners.",
    imageUrl: unsplash("photo-1581578731548-c64695cc6952"),
    photoCredit: "Unsplash",
    suggestedBudget: 15,
    suggestedRadius: 12,
  },
  {
    id: "retail",
    industrySlug: "retail-boutique",
    category: "Retail & Boutique",
    emoji: "🛍️",
    name: "Shop the Collection",
    headline: "New Arrivals You'll Love",
    bodyText:
      "Discover this season's must-have styles and unique finds. Shop our curated collection and enjoy free local delivery on orders over $50.",
    imageUrl: unsplash("photo-1441986300917-64674bd600d8"),
    photoCredit: "Unsplash",
    suggestedBudget: 15,
    suggestedRadius: 8,
  },
  {
    id: "financial-advisors",
    industrySlug: "financial-advisors",
    category: "Financial Advisors",
    emoji: "📈",
    name: "Plan With Confidence",
    headline: "A Clearer Path to Financial Confidence",
    bodyText:
      "Personalized guidance for retirement, investing, and protecting what you've built. Schedule a complimentary consultation to talk through your goals.",
    imageUrl: unsplash("photo-1554224155-6726b3ff858f"),
    photoCredit: "Unsplash",
    suggestedBudget: 20,
    suggestedRadius: 12,
  },
  {
    id: "insurance-agents",
    industrySlug: "insurance-agents",
    category: "Insurance Agents",
    emoji: "🛡️",
    name: "Coverage Made Clear",
    headline: "Coverage That Fits Your Life",
    bodyText:
      "Compare practical coverage options with a local insurance professional who listens. Get a personalized review and feel confident about your next step.",
    imageUrl: unsplash("photo-1450101499163-c8848c66ca85"),
    photoCredit: "Unsplash",
    suggestedBudget: 15,
    suggestedRadius: 12,
  },
  {
    id: "professional-services",
    industrySlug: "professional-services",
    category: "Professional Services",
    emoji: "💼",
    name: "Expert Support",
    headline: "Expert Support for Your Next Step",
    bodyText:
      "Get thoughtful, practical help from a local team that understands your goals. Book a consultation and turn your next challenge into a clear plan.",
    imageUrl: unsplash("photo-1556761175-b413da4baf72"),
    photoCredit: "Unsplash",
    suggestedBudget: 15,
    suggestedRadius: 10,
  },
  {
    id: "travel-agents",
    industrySlug: "travel-agents",
    category: "Travel Agents",
    emoji: "✈️",
    name: "Plan Your Escape",
    headline: "Make Your Next Trip Unforgettable",
    bodyText:
      "Thoughtful itineraries, trusted recommendations, and personal support from booking to return. Tell us where you want to go and we'll help plan the rest.",
    imageUrl: unsplash("photo-1500530855697-b586d89ba3ee"),
    photoCredit: "Unsplash",
    suggestedBudget: 15,
    suggestedRadius: 15,
  },
  {
    id: "other-business",
    industrySlug: "other",
    category: "Other / Custom Business",
    emoji: "✨",
    name: "Local Expertise",
    headline: "Local Expertise. Made for You.",
    bodyText:
      "Discover a better way to get the help, service, or experience you need. Connect with a local business that cares about doing things right.",
    imageUrl: unsplash("photo-1497366811353-6870744d04b2"),
    photoCredit: "Unsplash",
    suggestedBudget: 12,
    suggestedRadius: 10,
  },
  {
    id: "pet-services",
    industrySlug: "pet-services",
    category: "Pet Services",
    emoji: "🐾",
    name: "Pamper Your Pet",
    headline: "Your Pet Deserves the Best",
    bodyText:
      "Professional grooming, training, and daycare for your furry family member. First grooming session 20% off for new clients. Book today!",
    imageUrl: unsplash("photo-1587300003388-59208cc962cb"),
    photoCredit: "Unsplash",
    suggestedBudget: 10,
    suggestedRadius: 6,
  },
  {
    id: "healthcare",
    industrySlug: "healthcare-dental",
    category: "Healthcare & Dental",
    emoji: "🏥",
    name: "Your Health First",
    headline: "Compassionate Care Close to Home",
    bodyText:
      "Now accepting new patients! Comprehensive, personalized care with a team that truly listens. Schedule your appointment today and feel the difference.",
    imageUrl: unsplash("photo-1519494026892-80bbd2d6fd0d"),
    photoCredit: "Unsplash",
    suggestedBudget: 20,
    suggestedRadius: 10,
  },
];
