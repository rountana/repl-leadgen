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
      "Fresh flavors, a warm atmosphere, and a table waiting for you. Reserve today!",
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
      "Expert trainers, modern equipment, and your first week free. Start today!",
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
      "Professional beauty services with 20% off your first visit. Book today!",
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
      "Discover beautiful local homes with an experienced agent by your side.",
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
      "Licensed, insured repairs with free estimates and same-day service. Call today!",
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
      "New styles, local delivery, and free delivery on orders over $50. Shop today!",
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
      "Get practical guidance for retirement, investing, and protecting what you've built.",
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
      "Compare coverage with a local advisor. Get your personalized review today.",
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
      "Thoughtful local support for your next challenge. Book a consultation today.",
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
      "Personal trip planning and support from booking through your return. Start planning.",
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
      "Connect with a local team that understands your goals. Take the next step today.",
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
      "Professional pet care with 20% off a first grooming visit. Book today!",
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
      "Compassionate local care from a team that listens. Schedule today!",
    imageUrl: unsplash("photo-1519494026892-80bbd2d6fd0d"),
    photoCredit: "Unsplash",
    suggestedBudget: 20,
    suggestedRadius: 10,
  },
];
