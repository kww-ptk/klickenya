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
    stock_enabled: boolean;
    pos_enabled: boolean;
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
  /**
   * The `menus` column this feature's switch writes, and the same column
   * getStatus reads. Absent means there is no switch — the feature is
   * always-on, or not wired yet.
   *
   * Declared here so the switchboard, the tab strip and the status badge all
   * read one definition. They used to keep their own parallel switch
   * statements, which is how the delivery toggle ended up able to write a
   * column it could not read back.
   */
  flagColumn?: keyof NonNullable<FeatureContext['menu']>;
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
    flagColumn: 'table_ordering',
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
    flagColumn: 'reservations_enabled',
    getStatus: (ctx) => (ctx.menu?.reservations_enabled ? 'active' : 'inactive'),
  },
  {
    id: 'klickenya_kitchen',
    label: 'Klickenya Kitchen',
    shortDescription: 'Recipes, stock, costing and reports.',
    longDescription: 'Build recipes for every dish, log purchases and waste, and see margin and variance per ingredient. Stock auto-deducts when orders fire.',
    icon: 'ChefHat',
    appliesTo: ['restaurant'],
    tabSegment: 'kitchen',
    flagColumn: 'stock_enabled',
    getStatus: (ctx) => (ctx.menu?.stock_enabled ? 'active' : 'inactive'),
  },
  {
    id: 'takeaway',
    label: 'Takeaway orders',
    shortDescription: 'Customers order ahead for pickup.',
    longDescription:
      'Guests order from your public menu without a table, you accept with a ready time, they pick up and pay at the counter.',
    icon: 'ShoppingBag',
    appliesTo: ['restaurant'],
    tabSegment: 'orders',
    flagColumn: 'takeaway_enabled',
    getStatus: (ctx) => (ctx.menu?.takeaway_enabled ? 'active' : 'inactive'),
  },
  {
    id: 'pos',
    label: 'POS terminal',
    shortDescription: 'Tablet sign-in for waiters: take orders, settle bills, manage tables.',
    longDescription:
      'Staff sign in on a tablet with a 4-digit PIN, take orders at the table, move them through the kitchen and settle the bill. Independent of guest QR ordering — a waiter-only restaurant can run on this alone.',
    icon: 'Smartphone',
    appliesTo: ['restaurant'],
    tabSegment: 'pos',
    flagColumn: 'pos_enabled',
    getStatus: (ctx) => (ctx.menu?.pos_enabled ? 'active' : 'inactive'),
  },
  {
    id: 'delivery',
    label: 'Food delivery',
    shortDescription: 'Guests order from eat.klickenya.com for delivery.',
    longDescription:
      'Your restaurant appears on eat.klickenya.com. Guests order for delivery, the order lands in your Orders queue with the address, and the kitchen is messaged on WhatsApp. Your own rider delivers — Klickenya has no fleet yet.',
    icon: 'Bike',
    appliesTo: ['restaurant'],
    tabSegment: 'orders',
    flagColumn: 'delivery_enabled',
    getStatus: (ctx) => (ctx.menu?.delivery_enabled ? 'active' : 'inactive'),
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
