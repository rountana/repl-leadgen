/**
 * Pre-built campaign templates for common small business categories.
 * Images sourced from Unsplash (unsplash.com) — free to use under the Unsplash License.
 * Attribution is shown in the template picker.
 */

export interface CampaignTemplate {
  id: string;
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
    category: "Restaurant & Café",
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
    category: "Fitness & Gym",
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
    id: "pet-services",
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
