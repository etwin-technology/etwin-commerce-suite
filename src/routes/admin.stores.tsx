import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Crown, Clock, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Ban, Play, UserCheck } from "lucide-react";
import { api, useMockApi, getAuthToken, getTenantId, setTenantId } from "@/lib/api/client";
import type { AdminStore, PaginatedResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { setImpersonation } from "@/lib/impersonate";
import { storefrontUrlFor } from "@/lib/storefrontUrl";

export const Route = createFileRoute("/admin/stores")({
  component: AdminStoresPage,
});

const MOCK: PaginatedResponse<AdminStore> = {
  total: 3, page: 1, pages: 1,
  items: [
    { id: "s1", name: "Atlas Watches",   slug: "atlas-watches",   ownerEmail: "ahmed@demo.com", ownerName: "Ahmed Benali", ownerRole: "user",  plan: "pro",   expiresAt: "2026-05-01", active: true,  customDomain: "atlaswatches.ma", domainVerified: true,  orderCount: 42, productCount: 15, createdAt: "2026-04-01" },
    { id: "s2", name: "Sara Cosmetics",  slug: "sara-cosmetics",  ownerEmail: "fatima@demo.com",ownerName: "Fatima Zohra", ownerRole: "user",  plan: "trial", expiresAt: "2026-04-19", active: true,  customDomain: null,             domainVerified: false, orderCount: 5,  productCount: 8,  createdAt: "2026-04-05" },
    { id: "s3", name: "Karim Store",     slug: "karim-store",     ownerEmail: "karim@demo.com", ownerName: "Karim Tazi",   ownerRole: "user",  plan: "trial", expiresAt: "2026-03-29", active: false, customDomain: null,             domainVerified: false, orderCount: 0,  productCount: 2,  createdAt: "2026-03-15" },
  ],
};

function AdminStoresPage() {
  const isMock    = useMockApi();
  const { user, store: currentStore, refreshStore } = useAuth();
  const navigate  = useNavigate();
  const [data, setData]         = useState<PaginatedResponse<AdminStore> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage]         = useState(1);
  const [acting, setActing]     = useState<string | null>(null);
  const [planModal, setPlanModal] = useState<AdminStore | null>(null);
  const [newPlan, setNewPlan]   = useState<"pro" | "trial">("pro");
  const [months, setMonths]     = useState(1);

  const isSuperAdmin = user?.role === "super_admin";

  const load = () => {
    setLoading(true);
    if (isMock) { setData(MOCK); setLoading(false); return; }
    api.adminStores({ page, q: q || undefined, plan: planFilter || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, q, planFilter]);

  const updatePlan = async () => {
    if (!planModal || isMock) return;
    setActing(planModal.id);
    try {
      await api.adminUpdatePlan(planModal.id, newPlan, months);
      setPlanModal(null);
      load();
    } finally { setActing(null); }
  };

  const toggleSuspend = async (s: AdminStore) => {
    if (!confirm(`${s.active ? "Suspendre" : "Réactiver"} la boutique "${s.name}" ?`)) return;
    setActing(s.id);
    try {
      if (!isMock) await api.adminSuspendStore(s.id);
      load();
    } finally { setActing(null); }
  };

  const impersonate = async (s: AdminStore) => {
    if (!user) return;
    if (!confirm(`Se connecter en tant que propriétaire de "${s.name}" ?`)) return;
    setImpersonation({
      originalUser: user,
      originalStore: currentStore,
      originalToken: getAuthToken() ?? "",
      originalTenant: getTenantId(),
      targetStoreId: s.id,
      startedAt: new Date().toISOString(),
    });
    setTenantId(s.id);
    try {
      const target = await api.getStoreBySlug(s.slug);
      if (target) refreshStore(target);
    } catch { /* ignore */ }
    void navigate({ to: "/dashboard" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Boutiques</h2>
          <p className="text-xs text-white/40">{data?.total ?? 0} boutiques</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Rechercher…"
            className="w-full ps-9 pe-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
        >
          <option value="">Tous les plans</option>
          <option value="pro">Pro</option>
          <option value="trial">Essai</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-[11px] uppercase tracking-wider">
                <th className="text-start px-5 py-3">Boutique</th>
                <th className="text-start px-5 py-3">Propriétaire</th>
                <th className="text-start px-5 py-3">Plan</th>
                <th className="text-start px-5 py-3">Domaine</th>
                <th className="text-start px-5 py-3">Produits / Cmds</th>
                <th className="text-start px-5 py-3">Créée le</th>
                <th className="text-end px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-10 text-white/30">Chargement…</td></tr>}
              {!loading && (data?.items ?? []).length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-white/30">Aucune boutique</td></tr>
              )}
              {!loading && (data?.items ?? []).map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center text-xs font-bold">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-xs">{s.name}</p>
                        <p className="text-white/30 text-[10px]">/store/{s.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-white/80 text-xs">{s.ownerName}</p>
                    <p className="text-white/30 text-[10px]">{s.ownerEmail}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {s.plan === "pro" && s.active
                      ? <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-500/20 text-violet-300 flex items-center gap-1 w-fit"><Crown className="size-2.5" />Pro</span>
                      : !s.active
                      ? <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400">Expiré</span>
                      : <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 flex items-center gap-1 w-fit"><Clock className="size-2.5" />Essai</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {s.customDomain
                      ? <span className={s.domainVerified ? "text-green-400" : "text-amber-400"}>{s.customDomain}</span>
                      : <span className="text-white/20">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-white/50 text-xs">
                    {s.productCount} / {s.orderCount}
                  </td>
                  <td className="px-5 py-3.5 text-white/40 text-xs">
                    {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setPlanModal(s); setNewPlan("pro"); setMonths(1); }}
                        disabled={isMock}
                        title="Modifier le plan"
                        className="p-1.5 rounded-lg text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/10 disabled:opacity-40 transition-colors"
                      >
                        <Crown className="size-3.5" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => toggleSuspend(s)}
                          disabled={acting === s.id}
                          title={s.active ? "Suspendre" : "Réactiver"}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            s.active
                              ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                              : "text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {s.active ? <Ban className="size-3.5" /> : <Play className="size-3.5" />}
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button
                          onClick={() => impersonate(s)}
                          title="Se connecter en tant que ce marchand"
                          className="p-1.5 rounded-lg text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <UserCheck className="size-3.5" />
                        </button>
                      )}
                      <a
                        href={storefrontUrlFor(s.slug, { customDomain: s.customDomain, domainVerified: s.domainVerified })}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                        title="Voir la boutique"
                      >
                        <RefreshCw className="size-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(data?.pages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
            <span className="text-xs text-white/40">Page {data?.page} / {data?.pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/7 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setPage(p => Math.min(data?.pages ?? 1, p + 1))} disabled={page === data?.pages} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/7 disabled:opacity-30"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Plan modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70" onClick={() => setPlanModal(null)} />
          <div className="relative bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-sm z-10">
            <h3 className="font-bold text-white mb-1">Modifier le plan</h3>
            <p className="text-xs text-white/40 mb-5">{planModal.name}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-1.5">Plan</label>
                <div className="flex gap-2">
                  {(["trial","pro"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewPlan(p)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        newPlan === p ? "bg-violet-600 border-violet-500 text-white" : "border-white/20 text-white/60 hover:border-white/40"
                      }`}
                    >
                      {p === "pro" ? "Pro" : "Essai"}
                    </button>
                  ))}
                </div>
              </div>
              {newPlan === "pro" && (
                <div>
                  <label className="text-xs text-white/60 block mb-1.5">Durée (mois)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={months}
                    onChange={e => setMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-xl text-white text-sm focus:outline-none"
                  />
                  <p className="text-[11px] text-white/30 mt-1">Total: {months * 99} MAD</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setPlanModal(null)} className="flex-1 py-2 border border-white/20 text-white/60 rounded-xl text-sm hover:border-white/40">Annuler</button>
                <button
                  onClick={updatePlan}
                  disabled={!!acting || isMock}
                  className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-500 disabled:opacity-60"
                >
                  {acting ? "…" : "Mettre à jour"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMock && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertCircle className="size-3.5 shrink-0" />
          Mode démo — données mockées.
        </div>
      )}
    </div>
  );
}
