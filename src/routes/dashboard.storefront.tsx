import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Save, ExternalLink, Plus, Trash2, MessageCircle, Palette, Image as ImageIcon, Type, Link as LinkIcon, Facebook, Instagram, Youtube } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api/client";
import { ImageUploader } from "@/components/ImageUploader";
import { storeUrl } from "@/lib/storefrontUrl";
import type { MenuLink, Store, StoreSocials } from "@/lib/api/types";

export const Route = createFileRoute("/dashboard/storefront")({
  component: StorefrontEditor,
});

interface Draft {
  name: string;
  city: string;
  whatsappNumber: string;
  logoUrl: string | null;
  heroBanner: string | null;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  footerLinks: MenuLink[];
  footerDescription: string;
  socials: StoreSocials;
}

const fromStore = (s: Store): Draft => ({
  name: s.name,
  city: s.city ?? "",
  whatsappNumber: s.notifications?.whatsappNumber ?? "",
  logoUrl: s.header?.logoUrl ?? s.logoUrl ?? null,
  heroBanner: (s.header?.announcementText && s.header?.announcementBar) ? s.header.announcementText : null,
  heroTitle: s.header?.announcementText ?? "",
  heroSubtitle: s.footer?.description ?? "",
  primaryColor: s.theme?.primaryColor ?? "#7C3AED",
  footerLinks: s.footer?.links ?? [],
  footerDescription: s.footer?.description ?? "",
  socials: s.footer?.socials ?? {},
});

function StorefrontEditor() {
  const { store, refreshStore } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(store ? fromStore(store) : null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (store) setDraft(fromStore(store));
  }, [store?.id]);

  const dirty = useMemo(() => !!store && !!draft && JSON.stringify(draft) !== JSON.stringify(fromStore(store)), [draft, store]);

  if (!store || !draft) return null;

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!store || !draft) return;
    setSaving(true);
    try {
      const updated = await api.updateStore(store.id, {
        name: draft.name,
        city: draft.city,
        logoUrl: draft.logoUrl,
        notifications: { ...store.notifications, whatsappNumber: draft.whatsappNumber },
        theme: { ...store.theme, primaryColor: draft.primaryColor },
        header: {
          ...store.header,
          logoUrl: draft.logoUrl,
          announcementBar: !!draft.heroBanner,
          announcementText: draft.heroTitle || "",
          menuLinks: store.header?.menuLinks ?? [],
          showSearch: store.header?.showSearch ?? false,
        },
        footer: {
          ...store.footer,
          description: draft.footerDescription,
          links: draft.footerLinks,
          socials: draft.socials,
          showPoweredBy: store.footer?.showPoweredBy ?? true,
        },
      });
      refreshStore(updated);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">My Storefront</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize how your store looks to customers.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={storeUrl(store)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:bg-muted"
          >
            <ExternalLink className="size-4" /> Preview
          </a>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="size-4" /> {savedAt ? "Saved ✓" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* IDENTITY */}
      <Section icon={ImageIcon} title="Identity" subtitle="Logo, name, city">
        <div className="grid sm:grid-cols-[160px_1fr] gap-5 items-start">
          <div>
            <Label>Logo</Label>
            <ImageUploader value={draft.logoUrl} onChange={(url) => update("logoUrl", url)} aspect="square" label="Upload logo" />
          </div>
          <div className="space-y-3">
            <Field label="Store name">
              <Input value={draft.name} onChange={(v) => update("name", v)} placeholder="Atlas Watches" />
            </Field>
            <Field label="City">
              <Input value={draft.city} onChange={(v) => update("city", v)} placeholder="Casablanca" />
            </Field>
            <Field label="Public URL">
              <div className="flex items-center text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-muted-foreground">
                <span dir="ltr">{storeUrl(store)}</span>
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* HERO BANNER */}
      <Section icon={Type} title="Hero banner" subtitle="The first thing customers see on top of your store">
        <Field label="Banner image (optional, recommended 1600×600)">
          <ImageUploader value={draft.heroBanner} onChange={(url) => update("heroBanner", url)} aspect="wide" label="Upload banner" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Field label="Headline">
            <Input value={draft.heroTitle} onChange={(v) => update("heroTitle", v)} placeholder="-30% on every product today" />
          </Field>
          <Field label="Sub-text">
            <Input value={draft.heroSubtitle} onChange={(v) => update("heroSubtitle", v)} placeholder="Free delivery in Morocco" />
          </Field>
        </div>
      </Section>

      {/* THEME */}
      <Section icon={Palette} title="Theme color" subtitle="Used for buttons and highlights on your store">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={draft.primaryColor}
            onChange={(e) => update("primaryColor", e.target.value)}
            className="size-12 rounded-lg border border-input cursor-pointer p-0.5 bg-transparent"
          />
          <Input value={draft.primaryColor} onChange={(v) => update("primaryColor", v)} />
          <div className="flex gap-1.5">
            {["#7C3AED", "#DC2626", "#16A34A", "#2563EB", "#F59E0B", "#0F172A"].map((c) => (
              <button
                key={c}
                onClick={() => update("primaryColor", c)}
                className="size-8 rounded-lg border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* CONTACT */}
      <Section icon={MessageCircle} title="Contact & WhatsApp" subtitle="Where customer orders are delivered">
        <Field label="WhatsApp number (with country code, e.g. +212661234567)">
          <Input value={draft.whatsappNumber} dir="ltr" onChange={(v) => update("whatsappNumber", v)} placeholder="+212600000000" />
        </Field>
        <p className="text-[11px] text-muted-foreground mt-1">
          A floating WhatsApp button appears on your store and orders are sent here.
        </p>
      </Section>

      {/* FOOTER */}
      <Section icon={LinkIcon} title="Footer" subtitle="Links and social media at the bottom of your store">
        <Field label="Footer description">
          <Textarea
            value={draft.footerDescription}
            onChange={(v) => update("footerDescription", v)}
            placeholder="Quality products at Moroccan prices."
          />
        </Field>

        <Label>Footer links</Label>
        <div className="space-y-2">
          {draft.footerLinks.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={l.label}
                onChange={(v) => {
                  const arr = [...draft.footerLinks]; arr[i] = { ...l, label: v }; update("footerLinks", arr);
                }}
                placeholder="Label"
              />
              <Input
                value={l.url}
                onChange={(v) => {
                  const arr = [...draft.footerLinks]; arr[i] = { ...l, url: v }; update("footerLinks", arr);
                }}
                placeholder="https://…"
              />
              <button
                onClick={() => update("footerLinks", draft.footerLinks.filter((_, idx) => idx !== i))}
                className="size-9 rounded-lg border border-border hover:bg-muted text-destructive flex items-center justify-center"
                aria-label="Remove"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => update("footerLinks", [...draft.footerLinks, { label: "About", url: "#" }])}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Plus className="size-3.5" /> Add link
          </button>
        </div>

        <Label className="mt-5">Social media</Label>
        <div className="grid sm:grid-cols-2 gap-3">
          <SocialField icon={Instagram} placeholder="https://instagram.com/yourstore" value={draft.socials.instagram ?? ""} onChange={(v) => update("socials", { ...draft.socials, instagram: v })} />
          <SocialField icon={Facebook} placeholder="https://facebook.com/yourstore" value={draft.socials.facebook ?? ""} onChange={(v) => update("socials", { ...draft.socials, facebook: v })} />
          <SocialField icon={Youtube} placeholder="https://youtube.com/@yourstore" value={draft.socials.youtube ?? ""} onChange={(v) => update("socials", { ...draft.socials, youtube: v })} />
          <SocialField icon={MessageCircle} placeholder="TikTok URL" value={draft.socials.tiktok ?? ""} onChange={(v) => update("socials", { ...draft.socials, tiktok: v })} />
        </div>
      </Section>

      {/* Sticky save */}
      <div className="sticky bottom-4 flex justify-end mt-6">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-elegant hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="size-4" /> {savedAt ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="size-4" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold text-muted-foreground mb-1.5 ${className}`}>{children}</p>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
function Input({ value, onChange, placeholder, dir }: { value: string; onChange: (v: string) => void; placeholder?: string; dir?: "ltr" | "rtl" }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
    />
  );
}
function SocialField({ icon: Icon, value, onChange, placeholder }: { icon: React.ComponentType<{ className?: string }>; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 border border-input rounded-lg px-2.5 bg-background">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-10 bg-transparent text-sm focus:outline-none"
      />
    </div>
  );
}
