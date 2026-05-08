import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Bell, Check, ChevronRight, MessageCircle, Send, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api/client";
import type { DashboardStats, Order } from "@/lib/api/types";
import { MAD } from "@/lib/format";
import { storeUrl } from "@/lib/storefrontUrl";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as "ar" | "fr") || "ar";
  const { store, user, refreshStore } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    if (!store) return;
    setLoading(true);
    // Use allSettled so a single API failure doesn't blank the entire dashboard.
    Promise.allSettled([
      api.dashboardStats(store.id),
      api.listOrders(store.id),
      api.listProducts(store.id),
    ]).then(([s, o, p]) => {
      if (s.status === "fulfilled") setStats(s.value); else toast.error("Statistiques indisponibles");
      if (o.status === "fulfilled") setOrders(o.value.slice(0, 5));
      if (p.status === "fulfilled") setProductCount(p.value.length);
      setLoading(false);
    });
  };
  useEffect(reload, [store?.id]);

  if (!store) return null;

  const tasks = [
    { key: "task1", done: productCount > 0 },
    { key: "task2", done: !!store.notifications.whatsappNumber },
    { key: "task5", done: !!store.notifications.telegramChatId },
    { key: "task4", done: !!store.tracking.facebookPixel },
    { key: "task3", done: false },
    { key: "task6", done: false },
  ] as const;
  const completed = tasks.filter((x) => x.done).length;
  const pct = Math.round((completed / tasks.length) * 100);

  const confirm = async (id: string) => {
    if (!store) return;
    try {
      await api.confirmOrder(store.id, id);
      toast.success("Commande confirmée");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("dashboard.overview")}</p>
        <h1 className="font-serif text-4xl font-bold mt-2">{t("dashboard.welcome", { name: user?.fullName.split(" ")[0] })}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* Top KPIs — focused on TODAY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <BigKpi
          tone="primary"
          icon={Wallet}
          label={t("dashboard.todayRevenue")}
          value={stats ? MAD(stats.todayRevenue, lang) : "—"}
          loading={loading}
        />
        <BigKpi
          tone="ochre"
          icon={Bell}
          label={t("dashboard.newOrders")}
          value={stats ? String(stats.newOrdersCount) : "—"}
          loading={loading}
        />
        <BigKpi
          tone="success"
          icon={Sparkles}
          label={t("dashboard.pending")}
          value={stats ? String(stats.pendingCount) : "—"}
          loading={loading}
        />
      </div>

      {/* Checklist banner */}
      {pct < 100 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-serif text-lg font-bold">{t("dashboard.checklistTitle", { pct })}</h2>
              <p className="text-xs text-muted-foreground">{t("dashboard.checklistSub")}</p>
            </div>
            <div className="text-end">
              <span className="font-serif text-3xl font-bold text-primary num">{pct}%</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-primary to-ochre transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {tasks.map((task) => (
              <li
                key={task.key}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                  task.done ? "border-success/30 bg-success/5" : "border-border bg-surface-alt"
                }`}
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <span className={`size-5 rounded-full flex items-center justify-center text-[10px] ${
                    task.done ? "bg-success text-success-foreground" : "border border-border bg-background"
                  }`}>
                    {task.done && <Check className="size-3" />}
                  </span>
                  <span className={task.done ? "text-muted-foreground line-through" : ""}>{t(`dashboard.${task.key}`)}</span>
                </span>
                {!task.done && (
                  <Link to={taskLink(task.key)} className="text-xs font-medium text-primary inline-flex items-center gap-0.5">
                    <ChevronRight className="size-3.5 rtl:rotate-180" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mission of the day */}
      <div className="mb-6 rounded-2xl bg-primary text-primary-foreground p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -end-8 -top-8 size-32 rounded-full bg-ochre/30 blur-2xl" />
        <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70 font-semibold">{t("dashboard.missionTitle")}</p>
        <p className="mt-2 font-serif text-xl font-bold relative">{t("dashboard.missionText")}</p>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${store.name} 🛍️ ${storeUrl(store)}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 bg-card text-foreground rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          <MessageCircle className="size-4" /> {t("onboarding.shareWa")}
        </a>
      </div>

      {/* Sales graph + recent orders */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-lg font-bold">{t("dashboard.salesTrend")}</h2>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-serif text-3xl font-bold num">{stats ? MAD(stats.revenue, lang) : "—"}</span>
            <SmallDelta delta={stats?.revenueDelta ?? 0} />
          </div>
          <div className="mt-6 h-52 flex items-end gap-3">
            {(stats?.salesByDay ?? Array.from({ length: 7 }).map((_, i) => ({ day: "·", value: 0 }))).map((d, i) => {
              const max = Math.max(...(stats?.salesByDay ?? [{ value: 1 }]).map((x) => x.value), 1);
              const h = (d.value / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t bg-gradient-to-t from-primary/15 to-primary/55 transition-all" style={{ height: `${h}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{d.day}</span>
                </div>
              );
            })}
          </div>
          {stats?.bestSeller && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("dashboard.bestSeller")}</span>
              <span className="font-medium">{stats.bestSeller.name}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-bold">{t("dashboard.recentOrders")}</h2>
            <Link to="/dashboard/orders" className="text-xs font-medium text-primary">{t("dashboard.viewAll")}</Link>
          </div>
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{o.customerName}</p>
                  <p className="text-[11px] text-muted-foreground">#{o.id} · <span className="num">{MAD(o.total, lang)}</span></p>
                </div>
                {o.status === "pending" ? (
                  <button onClick={() => confirm(o.id)} className="text-xs font-semibold bg-success text-success-foreground rounded-full px-3 py-1.5 hover:opacity-90">
                    {t("dashboard.confirm")}
                  </button>
                ) : (
                  <StatusBadge status={o.status} />
                )}
              </li>
            ))}
            {!loading && orders.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("orders.empty")}</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function taskLink(key: string): "/dashboard/products" | "/dashboard/settings" {
  if (key === "task1") return "/dashboard/products";
  return "/dashboard/settings";
}

function BigKpi({
  tone,
  icon: Icon,
  label,
  value,
  loading,
}: {
  tone: "primary" | "ochre" | "success";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading: boolean;
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    ochre: "bg-ochre/15 text-ochre",
    success: "bg-success/15 text-success",
  };
  return (
    <div className="p-5 rounded-2xl border border-border bg-card flex items-center gap-4">
      <div className={`size-12 rounded-xl flex items-center justify-center ${map[tone]}`}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-serif text-2xl font-bold num truncate">{loading ? "—" : value}</p>
      </div>
    </div>
  );
}

function SmallDelta({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${positive ? "text-success" : "text-destructive"}`}>
      {positive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      <span className="num">{Math.abs(delta).toFixed(1)}%</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: "pending" | "paid" | "shipped" }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
    paid: "bg-success/15 text-success border-success/30",
    shipped: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[status]}`}>
      {t(`orders.${status}`)}
    </span>
  );
}
