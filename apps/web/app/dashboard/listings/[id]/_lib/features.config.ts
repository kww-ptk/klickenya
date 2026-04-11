export type ListingType = 'restaurant' | 'stay';
export type FeatureStatus = 'active' | 'inactive' | 'coming_soon' | 'paid_coming_soon';

export type FeatureContext = {
  listingType: ListingType;
  menu?: {
    id: string;
    table_ordering: boolean;
    reservations_enabled: boolean;
    ordering_enabled: boolean;
    takeaway_enabled: boolean;
    delivery_enabled: boolean;
  };
  property?: { id: string; is_active: boolean };
};

export type FeatureDefinition = {
  id: string;
  label: string;
  shortDescription: string;
  longDescription: string;
  icon: string; // lucide-react icon name as string — imported at render site
  appliesTo: ListingType[];
  tabSegment?: string; // if present, shows as a tab when status === 'active'
  getStatus: (ctx: FeatureContext) => FeatureStatus;
};

export const LISTING_FEATURES: FeatureDefinition[] = [
  {
    id: 'menu',
    label: 'Digital menu',
    shortDescription: 'QR-accessible menu for your guests.',
    longDescription: 'Your live menu. Edit items, sections, photos, and prices.',
    icon: 'UtensilsCrossed',
    appliesTo: ['restaurant'],
    tabSegment: 'menu',
    getStatus: (ctx) => (ctx.menu ? 'active' : 'inactive'),
  },
  {
    id: 'table_ordering',
    label: 'Table ordering',
    shortDescription: 'Guests order from their table via QR code.',
    longDescription: 'Cart + kitchen screen. No payment yet — cash or card at the table.',
    icon: 'ShoppingCart',
    appliesTo: ['restaurant'],
    tabSegment: 'orders',
    getStatus: (ctx) => (ctx.menu?.table_ordering ? 'active' : 'inactive'),
  },
  {
    id: 'reservations',
    label: 'Table reservations',
    shortDescription: 'Accept and manage bookings online.',
    longDescription: 'Guests book via your menu page or listing. You approve or decline from the dashboard.',
    icon: 'CalendarCheck',
    appliesTo: ['restaurant'],
    tabSegment: 'reservations',
    getStatus: (ctx) => (ctx.menu?.reservations_enabled ? 'active' : 'inactive'),
  },
  {
    id: 'takeaway',
    label: 'Takeaway orders',
    shortDescription: 'Customers order for pickup.',
    longDescription: 'Coming Q3 2026. Guests order ahead and collect.',
    icon: 'ShoppingBag',
    appliesTo: ['restaurant'],
    getStatus: () => 'coming_soon',
  },
  {
    id: 'delivery',
    label: 'Food delivery',
    shortDescription: 'Riders deliver orders to guests.',
    longDescription: 'Coming Q4 2026. Full delivery with live rider tracking.',
    icon: 'Bike',
    appliesTo: ['restaurant'],
    getStatus: () => 'coming_soon',
  },
];

export function getActiveTabs(ctx: FeatureContext): FeatureDefinition[] {
  return LISTING_FEATURES
    .filter(f => f.appliesTo.includes(ctx.listingType))
    .filter(f => f.tabSegment)
    .filter(f => f.getStatus(ctx) === 'active');
}

export function countActive(ctx: FeatureContext): number {
  return LISTING_FEATURES
    .filter(f => f.appliesTo.includes(ctx.listingType))
    .filter(f => f.getStatus(ctx) === 'active')
    .length;
}

export function countAvailable(ctx: FeatureContext): number {
  return LISTING_FEATURES.filter(f => f.appliesTo.includes(ctx.listingType)).length;
}
