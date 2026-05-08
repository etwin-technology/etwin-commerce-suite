// Shared types for the ETWIN Commerce REST client.
// Mirror the contract expected from the PHP backend.

export type Plan = "trial" | "starter" | "pro" | "business";
export type UserRole = "user" | "admin" | "super_admin";
export type Currency = "MAD" | "EUR" | "USD";
export type ProductStatus = "active" | "draft" | "archived";
export type OrderStatus = "pending" | "paid" | "shipped";
export type NotificationType = "order" | "system" | "payment" | "domain";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** true for admin + super_admin */
  isAdmin?: boolean;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface Subscription {
  plan: Plan;
  expiresAt: string;
  active: boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface StoreNotifications {
  whatsappNumber: string;
  telegramChatId?: string | null;
}

export interface StoreTracking {
  facebookPixel?: string | null;
  tiktokPixel?: string | null;
}

export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: "sm" | "md" | "lg" | "xl" | "full";
  darkMode?: boolean;
}

export interface MenuLink {
  label: string;
  url: string;
}

export interface StoreHeader {
  logoUrl?: string | null;
  menuLinks: MenuLink[];
  showSearch: boolean;
  announcementBar?: boolean;
  announcementText?: string;
  // ─── Modern display options (all optional, falls back to defaults) ──
  /** Optional hero banner image URL (rendered behind the hero gradient). */
  bannerImageUrl?: string | null;
  /** Custom hero title shown on the storefront landing area. */
  heroTitle?: string;
  /** Custom hero subtitle. */
  heroSubtitle?: string;
  /** CTA button label (e.g. "Voir les produits"). Empty hides the button. */
  heroCta?: string;
  /** Product grid columns on desktop (2, 3 or 4). Mobile is always 2. */
  productColumns?: 2 | 3 | 4;
  /** Toggle the COD / Free shipping trust bar under the hero. */
  showTrustBar?: boolean;
  /** Toggle the rotating "X bought from Y" social-proof pulse. */
  showLiveBuyer?: boolean;
  /** Toggle the 4.8★ ratings block in the product sheet. */
  showRatings?: boolean;
  /** Toggle the "🔥 N left" scarcity badge on cards/sheet. */
  showScarcity?: boolean;
}

export interface StoreSocials {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

export interface StoreFooter {
  description?: string;
  links: MenuLink[];
  socials: StoreSocials;
  showPoweredBy?: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  currency: Currency;
  city: string;
  logoUrl?: string | null;
  /**
   * Public URL where customers reach this store. Built by the backend from
   * APP_DOMAIN / STOREFRONT_URL_PATTERN — typically `https://<slug>.etwin.app`
   * (subdomain mode) or `<APP_BASE_URL>/store/<slug>` (path-mode fallback).
   * If a custom domain is configured AND verified, this is `https://<custom>`.
   */
  storefrontUrl?: string;
  notifications: StoreNotifications;
  tracking: StoreTracking;
  theme: StoreTheme;
  header: StoreHeader;
  footer: StoreFooter;
  customDomain?: string | null;
  domainVerified?: boolean;
  onboardingComplete: boolean;
  subscription: Subscription;
}

export interface AuthResponse {
  token: string;
  user: User;
  store: Store | null;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  extraImages?: string[];
  videoUrl?: string | null;
  stock: number;
  status: ProductStatus;
  createdAt: string;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  city?: string;
  customerId?: string;
  total: number;
  status: OrderStatus;
  notes?: string | null;
  items: OrderItem[];
  createdAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  revenue: number;
  ordersCount: number;
  customersCount: number;
  conversion: number;
  revenueDelta: number;
  ordersDelta: number;
  customersDelta: number;
  conversionDelta: number;
  todayRevenue: number;
  newOrdersCount: number;
  pendingCount: number;
  bestSeller?: { name: string; sales: number } | null;
  salesByDay: { day: string; value: number }[];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  refId?: string | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Domain ──────────────────────────────────────────────────────────────────

export interface DomainInfo {
  domain: string | null;
  verified: boolean;
  verifiedAt?: string | null;
  serverIp: string;
  instructions: Array<{
    type: string;
    host: string;
    value: string;
    ttl: number;
    comment: string;
  }>;
}

// ─── Subscription Plans ──────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  duration: string;
  features: string[];
  recommended?: boolean;
}

export interface SubscriptionHistory {
  id: number;
  plan: Plan;
  amount: number;
  startedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "cancelled";
}

export interface SubscriptionInfo {
  plan: Plan;
  active: boolean;
  expiresAt: string;
  daysLeft: number;
  expired: boolean;
  plans: SubscriptionPlan[];
  history: SubscriptionHistory[];
}

// ─── Plan Features ───────────────────────────────────────────────────────────

export interface PlanFeature {
  feature: string;
  minPlan: Plan;
  trialLimit: number | null;
  description: string;
}

// ─── Platform Settings ───────────────────────────────────────────────────────

export interface PlatformSettings {
  maintenance_mode: boolean;
  platform_name: string;
  trial_days: number;
  max_products_trial: number;
  pricing_price: number;
  pricing_currency: string;
  hero_badge_ar: string;
  hero_badge_fr: string;
  hero_title_ar: string;
  hero_title_fr: string;
  hero_subtitle_ar: string;
  hero_subtitle_fr: string;
  hero_cta_ar: string;
  hero_cta_fr: string;
  support_whatsapp?: string;
  support_email?: string;
  footer_text_ar: string;
  footer_text_fr: string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalStores: number;
  activeSubs: number;
  proSubs: number;
  trialSubs: number;
  expiredSubs: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyMrr: number;
  newUsers7d: number;
  userGrowth: { day: string; value: number }[];
  roleBreakdown?: Record<UserRole, number>;
}

export interface AdminUserStore {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  expiresAt: string;
  active: boolean;
  customDomain?: string | null;
  orderCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isAdmin: boolean;
  createdAt: string;
  store: AdminUserStore | null;
}

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  ownerRole: UserRole;
  plan: Plan;
  expiresAt: string;
  active: boolean;
  customDomain?: string | null;
  domainVerified: boolean;
  orderCount: number;
  productCount: number;
  createdAt: string;
}

export interface AdminDomain {
  storeId: string;
  storeName: string;
  storeSlug: string;
  domain: string;
  verified: boolean;
  verifiedAt?: string | null;
  ownerEmail: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pages: number;
  items: T[];
}

export interface StoreMemberDTO {
  id: string;
  storeId: string;
  userId: string | null;
  email: string;
  fullName: string;
  role: "owner" | "sales" | "stock" | "custom";
  permissions: Record<string, boolean>;
  active: boolean;
  invitedAt: string;
}

// ─── Feature flags / overrides (super-admin) ────────────────────────────────

export type FeatureKey =
  | "custom_domain"
  | "telegram_bot"
  | "pixels"
  | "analytics"
  | "remove_brand"
  | "priority_supp"
  | "excel_export"
  | "whatsapp_orders"
  | "product_limit"
  | "team_limit"
  | "order_limit";

/**
 * Effective feature flags for the current tenant.
 * Boolean features → true/false. Limit features → number (0 = unlimited for order_limit;
 * null = unlimited for product_limit; 0 = blocked otherwise).
 */
export interface EffectiveFeatures {
  custom_domain: boolean;
  telegram_bot: boolean;
  pixels: boolean;
  analytics: boolean;
  remove_brand: boolean;
  priority_supp: boolean;
  excel_export: boolean;
  whatsapp_orders: boolean;
  product_limit: number | null;
  team_limit: number;
  order_limit: number;
}

export interface FeatureCatalogItem {
  feature: FeatureKey;
  labelFr: string;
  labelAr: string;
  description: string | null;
  kind: "boolean" | "number";
  defaultMinPlan: "starter" | "pro" | "business";
  sortOrder: number;
}

export interface StoreFeatureOverride {
  granted: boolean;
  value: number | null;
  reason: string | null;
  expiresAt: string | null;
  grantedAt: string;
}

export interface StoreFeatureRow {
  feature: FeatureKey;
  labelFr: string;
  labelAr: string;
  description: string | null;
  kind: "boolean" | "number";
  /** "on" | "off" for boolean; number | "unlimited" for number features */
  planValue: "on" | "off" | "unlimited" | number | null;
  override: StoreFeatureOverride | null;
  effective: "on" | "off" | "unlimited" | number | null;
}

export interface StoreAccessResponse {
  storeId: string;
  storeName: string;
  plan: "starter" | "pro" | "business";
  planActive: boolean;
  expiresAt: string;
  features: StoreFeatureRow[];
}

export interface PlanCatalogEntry {
  id: "starter" | "pro" | "business";
  name: string;
  price: number;
  duration: string;
  productLimit: number | null;
  teamLimit: number;
  orderLimit: number;
  customDomain: boolean;
  telegramBot: boolean;
  pixels: boolean;
  analytics: boolean;
  removeBrand: boolean;
  prioritySupp: boolean;
  excelExport: boolean;
  recommended: boolean;
  sortOrder: number;
  active: boolean;
}
