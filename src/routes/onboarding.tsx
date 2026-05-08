import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Check, Copy, Image as ImageIcon, MessageCircle, Phone, Rocket, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api/client";
import { storeUrl as buildStoreUrl } from "@/lib/storefrontUrl";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB upload cap

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — ETWIN" }] }),
  component: () => (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  ),
});

interface FormState {
  productName: string;
  price: string;
  originalPrice: string;
  image: string;
  whatsapp: string;
  city: string;
}

function Onboarding() {
  const { t } = useTranslation();
  const { store, refreshStore } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<FormState>({
    productName: "",
    price: "",
    originalPrice: "",
    image: "",
    whatsapp: "",
    city: "",
  });

  if (!store) return null;

  const update = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const canNext =
    (step === 1 && form.productName.trim() && Number(form.price) > 0) ||
    (step === 2 && form.image.trim()) ||
    (step === 3 && /^\+?212/.test(form.whatsapp.replace(/\s/g, "")) && form.city.trim());

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier invalide — choisissez une image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image trop lourde (max 5 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("image")(reader.result as string);
    reader.onerror = () => toast.error("Erreur de lecture du fichier.");
    reader.readAsDataURL(file);
  };

  const launch = async () => {
    const price = Number(form.price);
    if (!form.productName.trim() || !(price > 0) || !form.image.trim()) {
      toast.error("Complétez le produit, l'image et le prix.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createProduct(store.id, {
        name: form.productName.trim(),
        description: "",
        price,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        image: form.image,
        stock: 10,
        status: "active",
      });
      const updated = await api.updateStore(store.id, {
        city: form.city,
        notifications: { ...store.notifications, whatsappNumber: form.whatsapp },
        onboardingComplete: true,
      });
      refreshStore(updated);
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const storeUrl = buildStoreUrl(store);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* noop */}
  };
  const waShare = `https://wa.me/?text=${encodeURIComponent(`${store.name} 🛍️ ${storeUrl}`)}`;
  const igShare = `https://www.instagram.com/`;

  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-alt p-6">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-elegant p-8 text-center">
          <div className="size-16 rounded-2xl bg-success/15 text-success flex items-center justify-center mx-auto mb-5">
            <Rocket className="size-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold">{t("onboarding.doneTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("onboarding.doneSub")}</p>

          <div className="mt-6 flex items-center gap-2 p-3 rounded-xl border border-border bg-surface-alt">
            <code className="flex-1 truncate text-xs text-foreground text-start" dir="ltr">{storeUrl}</code>
            <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-lg px-3 py-1.5 hover:bg-muted">
              {copied ? <><Check className="size-3.5 text-success" />{t("onboarding.copied")}</> : <><Copy className="size-3.5" />{t("onboarding.copyLink")}</>}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={waShare} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-success text-success-foreground py-2.5 text-sm font-semibold hover:opacity-90">
              <MessageCircle className="size-4" /> {t("onboarding.shareWa")}
            </a>
            <a href={igShare} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-2.5 text-sm font-semibold hover:opacity-90">
              <ShoppingBag className="size-4" /> {t("onboarding.shareIg")}
            </a>
          </div>

          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-6 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90"
          >
            {t("onboarding.goDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface-alt">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 h-16">
          <span className="font-serif text-xl font-bold text-primary">ETWIN</span>
          <LanguageSwitcher subtle />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Progress */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("onboarding.step", { n: step })}
          </p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-bold">{t("onboarding.title")}</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card p-6 sm:p-8">
          {step === 1 && (
            <>
              <div className="flex items-start gap-3 mb-6">
                <div className="size-10 rounded-lg bg-ochre/15 text-ochre flex items-center justify-center"><ShoppingBag className="size-5" /></div>
                <div>
                  <h2 className="font-serif text-xl font-bold">{t("onboarding.s1Title")}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("onboarding.s1Sub")}</p>
                </div>
              </div>
              <div className="space-y-4">
                <Field label={t("onboarding.productName")} value={form.productName} onChange={update("productName")} placeholder={t("onboarding.productNamePh")} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("onboarding.price")} type="number" value={form.price} onChange={update("price")} placeholder="299" />
                  <Field label={t("onboarding.originalPrice")} type="number" value={form.originalPrice} onChange={update("originalPrice")} placeholder="450" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-start gap-3 mb-6">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><ImageIcon className="size-5" /></div>
                <div>
                  <h2 className="font-serif text-xl font-bold">{t("onboarding.s2Title")}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("onboarding.s2Sub")}</p>
                </div>
              </div>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                  className="hidden"
                />
                <div className={`aspect-video rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                  form.image ? "border-success bg-success/5" : "border-border hover:border-primary bg-surface-alt"
                }`}>
                  {form.image ? (
                    <img src={form.image} alt="preview" className="size-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="size-10 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">{t("onboarding.uploadImage")}</p>
                    </div>
                  )}
                </div>
              </label>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1.5">{t("onboarding.orPasteUrl")}</p>
                <input
                  type="url"
                  dir="ltr"
                  value={form.image.startsWith("data:") ? "" : form.image}
                  onChange={(e) => update("image")(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-start gap-3 mb-6">
                <div className="size-10 rounded-lg bg-success/15 text-success flex items-center justify-center"><Phone className="size-5" /></div>
                <div>
                  <h2 className="font-serif text-xl font-bold">{t("onboarding.s3Title")}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("onboarding.s3Sub")}</p>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="WhatsApp" value={form.whatsapp} onChange={update("whatsapp")} placeholder={t("onboarding.whatsappPh")} dir="ltr" />
                <Field label={t("onboarding.city")} value={form.city} onChange={update("city")} placeholder={t("onboarding.cityPh")} />
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {t("onboarding.back")}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {t("onboarding.next")}
              </button>
            ) : (
              <button
                onClick={launch}
                disabled={!canNext || submitting}
                className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? t("onboarding.creating") : t("onboarding.finish")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
      />
    </label>
  );
}
