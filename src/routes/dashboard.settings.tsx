import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Check, MessageCircle, Send, Activity, BadgeCheck, Crown,
  ExternalLink, Loader2, Lock, Phone, Sparkles, Store as StoreIcon, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api, useMockApi } from "@/lib/api/client";
import { useStoreFeatures } from "@/hooks/useStoreFeatures";
import { FeatureLock, FeatureLockBadge } from "@/components/FeatureLock";
import { storeUrl } from "@/lib/storefrontUrl";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { store, refreshStore } = useAuth();
  const { features } = useStoreFeatures();
  const isMock = useMockApi();

  const [city, setCity] = useState(store?.city || "");
  const [whatsapp, setWhatsapp] = useState(store?.notifications.whatsappNumber || "");
  const [fbPixel, setFbPixel] = useState(store?.tracking.facebookPixel || "");
  const [tiktokPixel, setTiktokPixel] = useState(store?.tracking.tiktokPixel || "");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [tgConnecting, setTgConnecting] = useState(false);

  if (!store) return null;

  const days = Math.max(0,
    Math.ceil((new Date(store.subscription.expiresAt).getTime() - Date.now()) / 86400000));
  const planLabel = store.subscription.plan === "business" ? "Business"
    : store.subscription.plan === "pro" ? "Pro"
    : "Starter";

  const lockedPixels   = !!features && !features.pixels;
  const lockedTelegram = !!features && !features.telegram_bot;
  const lockedWa       = !!features && !features.whatsapp_orders;

  const flash = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey(k => (k === key ? null : k)), 1800);
  };

  const saveInfo = async () => {
    if (city.length > 80) { toast.error("Ville trop longue"); return; }
    setSavingKey("info");
    try {
      const updated = await api.updateStore(store.id, { city });
      refreshStore(updated);
      toast.success("Infos boutique enregistrées");
      flash("info");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setSavingKey(null); }
  };

  const saveWhatsapp = async () => {
    const num = whatsapp.trim();
    if (num && num.replace(/\D/g, "").length < 8) {
      toast.error("Numéro WhatsApp invalide");
      return;
    }
    setSavingKey("wa");
    try {
      const updated = await api.updateStore(store.id, {
        notifications: { ...store.notifications, whatsappNumber: num },
      });
      refreshStore(updated);
      toast.success("WhatsApp enregistré");
      flash("wa");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setSavingKey(null); }
  };

  const savePixels = async () => {
    if (fbPixel && !/^[A-Za-z0-9_-]{6,40}$/.test(fbPixel)) {
      toast.error("Format Pixel Facebook invalide"); return;
    }
    if (tiktokPixel && !/^[A-Za-z0-9_-]{6,40}$/.test(tiktokPixel)) {
      toast.error("Format Pixel TikTok invalide"); return;
    }
    setSavingKey("pixels");
    try {
      const updated = await api.updateStore(store.id, {
        tracking: { facebookPixel: fbPixel || null, tiktokPixel: tiktokPixel || null },
      });
      refreshStore(updated);
      toast.success("Pixels enregistrés");
      flash("pixels");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setSavingKey(null); }
  };

  /**
   * Real Telegram connect. The dashboard hits the backend, gets a t.me deep
   * link, and opens it. The user presses START in Telegram, the bot webhook
   * binds the chat id to the store, and the dashboard polls the store on
   * focus to detect the new chat id.
   */
  const connectTelegram = async () => {
    if (isMock) {
      // Demo-only fallback so the button does something visible without backend.
      const updated = await api.updateStore(store.id, {
        notifications: { ...store.notifications, telegramChatId: "demo-chat" },
      });
      refreshStore(updated);
      toast.success("Telegram connecté (mode démo)");
      return;
    }
    setTgConnecting(true);
    try {
      const { url } = await api.telegramConnectLink();
      // Open the Telegram deep link. The webhook binds the chat id server-side.
      window.open(url, "_blank", "noopener,noreferrer");
      toast.info("Appuyez sur START dans Telegram, puis revenez ici.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur Telegram");
    } finally { setTgConnecting(false); }
  };

  const disconnectTelegram = async () => {
    if (!confirm("Déconnecter Telegram ?")) return;
    try {
      const updated = await api.updateStore(store.id, {
        notifications: { ...store.notifications, telegramChatId: null },
      });
      refreshStore(updated);
      toast.success("Telegram déconnecté");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paramètres</p>
          <h1 className="font-serif text-4xl font-bold mt-2">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>
        <Link
          to="/dashboard/subscription"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Crown className="size-4 text-amber-500" />
          Plan {planLabel} · {days} j restants
        </Link>
      </div>

      {/* Store info */}
      <Section
        icon={StoreIcon}
        title={t("settings.storeInfo")}
        subtitle="Identifiant public et localisation."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <ReadOnly label="Nom de la boutique" value={store.name} />
          <ReadOnly label="URL" value={storeUrl(store)} />
          <Field label={t("onboarding.city")} value={city} onChange={setCity} placeholder="Casablanca" />
          <ReadOnly label="Devise" value={store.currency} />
        </div>
        <ActionRow>
          <SaveBtn
            onClick={saveInfo}
            saving={savingKey === "info"}
            saved={savedKey === "info"}
          />
        </ActionRow>
      </Section>

      {/* WhatsApp orders */}
      <Section
        icon={MessageCircle}
        title="Commandes WhatsApp"
        subtitle="Bouton « Commander sur WhatsApp » sur la boutique publique."
        locked={lockedWa}
      >
        <FeatureLock locked={lockedWa} feature="whatsapp_orders" reason="Demandez à votre administrateur d'activer cette fonctionnalité.">
          <Field
            label="Numéro WhatsApp (format international)"
            value={whatsapp}
            onChange={setWhatsapp}
            dir="ltr"
            placeholder="+212 6 12 34 56 78"
            icon={Phone}
          />
          {whatsapp && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Aperçu : <span className="font-mono text-foreground">wa.me/{whatsapp.replace(/\D/g, "")}</span>
            </p>
          )}
        </FeatureLock>
        <ActionRow>
          <SaveBtn
            onClick={saveWhatsapp}
            saving={savingKey === "wa"}
            saved={savedKey === "wa"}
            disabled={lockedWa}
          />
        </ActionRow>
      </Section>

      {/* Telegram bot */}
      <Section
        icon={Send}
        title="Notifications Telegram"
        subtitle="Recevez chaque commande sur Telegram avec [Confirmer] / [Annuler]."
        locked={lockedTelegram}
      >
        <FeatureLock locked={lockedTelegram} feature="telegram_bot">
          <div className="rounded-xl border border-border bg-surface-alt p-4 flex items-center gap-4">
            <div className={`size-12 rounded-xl flex items-center justify-center ${
              store.notifications.telegramChatId ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
            }`}>
              {store.notifications.telegramChatId ? <BadgeCheck className="size-6" /> : <Send className="size-6" />}
            </div>
            <div className="flex-1 min-w-0">
              {store.notifications.telegramChatId ? (
                <>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    {t("settings.telegramConnected")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                    Chat ID : {store.notifications.telegramChatId}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm">Telegram non connecté</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cliquez « Connecter », ouvrez Telegram, puis appuyez sur START.
                  </p>
                </>
              )}
            </div>
            {store.notifications.telegramChatId ? (
              <button
                onClick={disconnectTelegram}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-border rounded-full px-3.5 py-1.5 hover:bg-accent shrink-0"
                title="Déconnecter"
              >
                <Trash2 className="size-3.5" />
                Déconnecter
              </button>
            ) : (
              <button
                onClick={connectTelegram}
                disabled={tgConnecting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full px-3.5 py-1.5 hover:bg-primary/90 disabled:opacity-60 shrink-0"
              >
                {tgConnecting ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
                {t("settings.telegramConnect")}
              </button>
            )}
          </div>
        </FeatureLock>
      </Section>

      {/* Pixels */}
      <Section
        icon={Activity}
        title={t("settings.tracking")}
        subtitle="Suivez vos campagnes Facebook & TikTok dès le premier jour."
        locked={lockedPixels}
      >
        <FeatureLock locked={lockedPixels} feature="pixels">
          <div className="space-y-3">
            <Field
              label={t("settings.fbPixel")}
              value={fbPixel}
              onChange={setFbPixel}
              placeholder="123456789012345"
              dir="ltr"
              hint="ID numérique fourni dans le Gestionnaire d'événements Meta."
            />
            <Field
              label={t("settings.tiktokPixel")}
              value={tiktokPixel}
              onChange={setTiktokPixel}
              placeholder="C12ABC34DE56FG78H"
              dir="ltr"
              hint="Identifiant alphanumérique de TikTok Events Manager."
            />
          </div>
        </FeatureLock>
        <ActionRow>
          <SaveBtn
            onClick={savePixels}
            saving={savingKey === "pixels"}
            saved={savedKey === "pixels"}
            disabled={lockedPixels}
          />
        </ActionRow>
      </Section>

      {/* Subscription summary */}
      <Section
        icon={Sparkles}
        title="Abonnement"
        subtitle="Plan actif et accès rapide à la facturation."
      >
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-alt">
          <div>
            <p className="font-serif text-2xl font-bold flex items-center gap-2">
              {planLabel}
              {store.subscription.plan === "pro"      && <Crown className="size-5 text-violet-500" />}
              {store.subscription.plan === "business" && <Crown className="size-5 text-emerald-500" />}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {days > 0
                ? `${days} jour${days > 1 ? "s" : ""} restants · expire ${new Date(store.subscription.expiresAt).toLocaleDateString("fr-FR")}`
                : "Plan expiré — renouvelez pour continuer."}
            </p>
          </div>
          <Link
            to="/dashboard/subscription"
            className="inline-flex items-center gap-1.5 text-sm font-bold bg-primary text-primary-foreground rounded-full px-4 py-2 hover:bg-primary/90"
          >
            Gérer
          </Link>
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Layout primitives                                                      */
/* ─────────────────────────────────────────────────────────────────────── */

function Section({
  icon: Icon, title, subtitle, locked, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 mb-5 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {locked ? <Lock className="size-5" /> : <Icon className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-xl font-bold flex items-center">
            {title}
            <FeatureLockBadge locked={!!locked} />
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="mt-1 font-medium text-sm break-all">{value}</p>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, dir, icon: Icon, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground mb-1.5 block">{label}</span>
      <div className="relative">
        {Icon && <Icon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />}
        <input
          value={value}
          dir={dir}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${Icon ? "ps-9 pe-3" : "px-3.5"}`}
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex justify-end">{children}</div>;
}

function SaveBtn({
  onClick, saving, saved, disabled,
}: { onClick: () => void; saving: boolean; saved: boolean; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {saving ? <Loader2 className="size-4 animate-spin" />
        : saved ? <Check className="size-4" />
        : null}
      {saving ? t("common.loading") : saved ? t("settings.saved") : t("settings.save")}
    </button>
  );
}
