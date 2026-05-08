import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import "../i18n";
import { applyLangToDocument } from "../i18n";
import { AuthProvider } from "../lib/auth";
import { ImpersonationBanner } from "../components/ImpersonationBanner";
import { DemoModeBanner } from "../components/DemoModeBanner";
import i18n from "../i18n";
import { slugFromHost } from "../lib/storefrontUrl";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-serif font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ETWIN Commerce — Build your store, scale your brand" },
      { name: "description", content: "ETWIN Commerce is a multi-tenant SaaS platform that lets you launch and run a modern online store in minutes. Available in Arabic and French." },
      { name: "author", content: "ETWIN" },
      { property: "og:title", content: "ETWIN Commerce — Build your store, scale your brand" },
      { property: "og:description", content: "ETWIN Commerce is a multi-tenant SaaS platform that lets you launch and run a modern online store in minutes. Available in Arabic and French." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ETWIN Commerce — Build your store, scale your brand" },
      { name: "twitter:description", content: "ETWIN Commerce is a multi-tenant SaaS platform that lets you launch and run a modern online store in minutes. Available in Arabic and French." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18584c10-f3e3-4416-a060-b25d76f1d0d1/id-preview-6d5ee0bb--26f29c2b-6f40-4f8d-9353-e3fa5d05b342.lovable.app-1777367219886.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18584c10-f3e3-4416-a060-b25d76f1d0d1/id-preview-6d5ee0bb--26f29c2b-6f40-4f8d-9353-e3fa5d05b342.lovable.app-1777367219886.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=PT+Serif:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    applyLangToDocument(i18n.resolvedLanguage || "ar");
    // Subdomain bootstrap: when the user lands on <slug>.<APP_DOMAIN> at "/",
    // route to the storefront for that slug.
    if (typeof window !== "undefined") {
      const slug = slugFromHost();
      if (slug && window.location.pathname === "/") {
        window.history.replaceState(null, "", `/store/${encodeURIComponent(slug)}${window.location.search}`);
      }
    }
  }, []);
  return (
    <AuthProvider>
      <DemoModeBanner />
      <ImpersonationBanner />
      <Outlet />
      <Toaster richColors position="top-center" closeButton />
    </AuthProvider>
  );
}
