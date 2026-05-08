// Build the public URL for a storefront from frontend env vars.
// Backend also computes this in Mapper::storefrontUrl() and sends it back as
// `store.storefrontUrl` — prefer that when present. This helper is the fallback
// (mock mode, building a link before the store row is loaded, etc.).
//
// Env vars (mirror backend APP_DOMAIN / STOREFRONT_URL_PATTERN):
//   VITE_APP_DOMAIN              e.g. "etwin.app"   (empty → path mode)
//   VITE_STOREFRONT_URL_PATTERN  e.g. "https://{slug}.{domain}" or "path"

import type { Store } from "@/lib/api/types";

const APP_DOMAIN = ((import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? "").trim();
const PATTERN    = ((import.meta.env.VITE_STOREFRONT_URL_PATTERN as string | undefined) ?? "path").trim();

export function storefrontUrlFor(slug: string, opts?: {
  customDomain?: string | null;
  domainVerified?: boolean;
}): string {
  if (opts?.domainVerified && opts.customDomain) {
    const scheme = PATTERN.startsWith("https://") ? "https" : (typeof window !== "undefined" ? window.location.protocol.replace(":", "") : "https");
    return `${scheme}://${opts.customDomain}`;
  }

  if (PATTERN === "" || PATTERN === "path" || APP_DOMAIN === "") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/store/${encodeURIComponent(slug)}`;
  }

  return PATTERN.replace("{slug}", slug).replace("{domain}", APP_DOMAIN);
}

/** Prefer the URL the backend already built; only fall back when missing. */
export function storeUrl(store: Pick<Store, "slug" | "customDomain" | "domainVerified"> & { storefrontUrl?: string }): string {
  if (store.storefrontUrl) return store.storefrontUrl;
  return storefrontUrlFor(store.slug, {
    customDomain: store.customDomain,
    domainVerified: store.domainVerified,
  });
}

/**
 * If the user is currently visiting <slug>.<APP_DOMAIN>, return the slug.
 * Used by the storefront bootstrap to load the right store from the host.
 */
export function slugFromHost(): string | null {
  if (typeof window === "undefined") return null;
  if (!APP_DOMAIN) return null;
  const host = window.location.hostname.toLowerCase();
  // Strip port from APP_DOMAIN if present (we only compare hostname)
  const baseHost = APP_DOMAIN.split(":")[0].toLowerCase();
  if (host === baseHost) return null;
  if (!host.endsWith("." + baseHost)) return null;
  const slug = host.slice(0, -1 - baseHost.length);
  // Reject www / api / admin subdomains
  if (["www", "api", "admin", "app"].includes(slug)) return null;
  return slug || null;
}
