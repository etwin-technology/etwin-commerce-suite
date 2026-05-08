import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut,
  Store as StoreIcon, ExternalLink, LayoutTemplate, Palette,
  Globe, CreditCard, Menu, X, ChevronRight, Shield,
  Settings, ChevronDown, UserCog,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { storeUrl } from "@/lib/storefrontUrl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  to: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
}

const mainNav: NavItem[] = [
  { to: "/dashboard",           key: "dashboard",  icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/dashboard/products",  key: "products",   icon: Package,         label: "Produits" },
  { to: "/dashboard/orders",    key: "orders",     icon: ShoppingCart,    label: "Commandes" },
  { to: "/dashboard/customers", key: "customers",  icon: Users,           label: "Clients" },
];

const storeNav: NavItem[] = [
  { to: "/dashboard/storefront", key: "storefront", icon: LayoutTemplate,  label: "Ma boutique",   badge: "NEW" },
  { to: "/dashboard/customize",  key: "customize",  icon: Palette,         label: "Personnaliser" },
  { to: "/dashboard/domains",    key: "domains",    icon: Globe,           label: "Domaine" },
  { to: "/dashboard/team",       key: "team",       icon: UserCog,         label: "Équipe" },
];

function NavGroup({ title, items, location, onNavigate }: {
  title: string;
  items: NavItem[];
  location: { pathname: string };
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-1">
      <p className="px-3 mb-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-sidebar-foreground/40 select-none">
        {title}
      </p>
      {items.map(({ to, icon: Icon, label, badge }) => {
        const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
              active
                ? "bg-white/10 text-white shadow-sm"
                : "text-sidebar-foreground/65 hover:text-white hover:bg-white/7"
            }`}
          >
            <span className={`flex items-center justify-center size-7 rounded-lg transition-colors ${
              active ? "bg-white/15 text-white" : "group-hover:bg-white/10"
            }`}>
              <Icon className="size-4" />
            </span>
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 uppercase tracking-wider">
                {badge}
              </span>
            )}
            {active && <ChevronRight className="size-3.5 text-white/50" />}
          </Link>
        );
      })}
    </div>
  );
}

/** Floating user menu in the header (Settings + Subscription + Logout). */
function UserMenu() {
  const { user, store, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setOpen(false);
    logout();
    void navigate({ to: "/" });
  };

  // close on outside click
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  const days = store
    ? Math.max(0, Math.ceil((new Date(store.subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;
  const isPro     = store?.subscription.plan === "pro";
  const isExpired = days <= 0 && !!store;

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 hover:bg-accent transition-colors focus:outline-none"
        aria-label="Menu utilisateur"
      >
        <span className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
          {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
        </span>
        <span className="hidden sm:block text-xs font-semibold max-w-[100px] truncate">{user?.fullName?.split(" ")[0]}</span>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-60 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <p className="text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            {user?.role && user.role !== "user" && (
              <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                user.role === "super_admin"
                  ? "bg-amber-400/15 text-amber-600"
                  : "bg-blue-400/15 text-blue-600"
              }`}>
                {user.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>
            )}
          </div>

          {/* Subscription status */}
          {store && (
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Abonnement</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPro
                    ? "bg-violet-500/10 text-violet-600"
                    : isExpired
                    ? "bg-red-500/10 text-red-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}>
                  {isPro ? "Pro" : isExpired ? "Expiré" : "Essai"}
                </span>
              </div>
              {!isExpired && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isPro ? "Actif" : `${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          )}

          {/* Menu items */}
          <div className="px-2 py-2">
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>Paramètres</span>
            </Link>
            <Link
              to="/dashboard/subscription"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-accent transition-colors"
            >
              <CreditCard className="size-4 text-muted-foreground" />
              <span>Abonnement</span>
              {isExpired && (
                <span className="ms-auto text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">Renouveler</span>
              )}
            </Link>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Shield className="size-4" />
                <span>Panel Admin</span>
              </Link>
            )}
          </div>

          <div className="px-2 pb-2 border-t border-border pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { store, user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const subscription = store?.subscription;
  const daysLeft     = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;
  const isPro      = subscription?.plan === "pro";
  const isExpired  = daysLeft <= 0 && !!store;
  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";

  const closeMobile = () => setMobileOpen(false);

  const Sidebar = (
    <aside className="flex flex-col h-full bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-2.5" onClick={closeMobile}>
          <div className="size-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <StoreIcon className="size-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight">ETWIN</p>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.15em]">Commerce</p>
          </div>
        </Link>

        {/* Store pill */}
        {store && (
          <div className="mt-4 flex items-center gap-2.5 bg-white/7 border border-white/10 rounded-xl px-3 py-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {store.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{store.name}</p>
              <p className="text-[10px] text-white/40 truncate">/store/{store.slug}</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        <NavGroup title="Gestion"   items={mainNav}  location={location} onNavigate={closeMobile} />
        <NavGroup title="Boutique"  items={storeNav} location={location} onNavigate={closeMobile} />

        {/* Admin section — visible only to admin roles */}
        {isAdminUser && (
          <div>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-amber-300/60 select-none">
              {user?.role === "super_admin" ? "Super Admin" : "Admin"}
            </p>
            <Link
              to="/admin"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname.startsWith("/admin")
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-amber-300/60 hover:text-amber-300 hover:bg-amber-500/10"
              }`}
            >
              <span className="size-7 rounded-lg flex items-center justify-center bg-amber-500/10">
                <Shield className="size-4" />
              </span>
              <span>Panel Admin</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom — subscription badge + store link */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-2">
        {/* Subscription badge */}
        {store && (
          <Link
            to="/dashboard/subscription"
            onClick={closeMobile}
            className={`block mx-2 rounded-xl p-3 border text-xs transition-opacity hover:opacity-80 ${
              isPro
                ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                : isExpired
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`size-1.5 rounded-full ${isPro ? "bg-violet-400" : isExpired ? "bg-red-400" : "bg-amber-400"}`} />
              <span className="font-semibold uppercase tracking-wide text-[10px]">
                {isPro ? "Pro" : isExpired ? "Expiré" : "Essai gratuit"}
              </span>
            </div>
            <p className="text-white/50 text-[10px]">
              {isExpired ? "Renouveler le plan →" : `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`}
            </p>
          </Link>
        )}

        {store && (
          <a
            href={storeUrl(store)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/7 transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Voir la boutique
          </a>
        )}

        <button
          onClick={() => { logout(); void navigate({ to: "/" }); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="size-3.5" />
          Se déconnecter
        </button>

        {user && (
          <div className="px-3 pt-2 border-t border-white/10 mt-2">
            <p className="text-xs font-semibold truncate">{user.fullName}</p>
            <p className="text-[10px] text-white/40 truncate">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-dvh grid grid-cols-1 md:grid-cols-[260px_1fr] bg-[#f7f7fb]">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={closeMobile} />
          <div className="relative w-64 h-full shadow-2xl">
            {Sidebar}
          </div>
          <button
            className="absolute top-4 left-[272px] text-white bg-white/10 rounded-full p-1.5"
            onClick={closeMobile}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col min-w-0 min-h-dvh">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-white sticky top-0 z-30 shadow-sm">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent"
          >
            <Menu className="size-5" />
          </button>

          {/* Page breadcrumb (desktop) */}
          <div className="hidden md:block">
            <p className="text-xs text-muted-foreground">
              {t(`nav.${location.pathname.split("/").pop() || "dashboard"}`, { defaultValue: "" })}
            </p>
          </div>

          {/* Right actions */}
          <div className="ms-auto flex items-center gap-2">
            <NotificationBell />
            <LanguageSwitcher />
            {store && (
              <a
                href={storeUrl(store)}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 hover:bg-accent transition-colors"
              >
                <ExternalLink className="size-3" />
                Boutique
              </a>
            )}
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
