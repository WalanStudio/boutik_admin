import React, { useEffect, useState } from "react";
import {
  ShoppingCart, TrendingUp, Clock, Package,
  Truck, CheckCircle, Store, AlertTriangle, Users,
} from "lucide-react";
import { getDashboardStats } from "../lib/db";
import type { DashboardStats } from "../lib/supabase";
import { PageHeader } from "../components/Layout";

function fcfa(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-[28px] font-extrabold text-dark mt-1 leading-none" style={{ fontFamily: "'DM Mono', monospace" }}>
            {value}
          </p>
          {sub && <p className="text-[12px] text-slate-400 mt-1 font-medium">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color} flex items-center justify-between`}>
      <span className="text-[13px] font-bold">{label}</span>
      <span className="text-[22px] font-extrabold" style={{ fontFamily: "'DM Mono', monospace" }}>{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-red-500 font-semibold">{error}</div>
  );

  if (!stats) return null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Tableau de bord" subtitle={"Aujourd'hui — " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} />

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Commandes aujourd'hui" value={stats.commandes_today}  icon={ShoppingCart} color="bg-brand-500" />
        <StatCard label="CA aujourd'hui"         value={fcfa(stats.ca_today)}  icon={TrendingUp}   color="bg-blue-500" />
        <StatCard label="Boutiques actives"       value={stats.total_boutiques} icon={Store}        color="bg-purple-500" />
        <StatCard label="Produits actifs"         value={stats.produits_actifs} icon={Package}      color="bg-amber-500" />
      </div>

      {/* Pipeline commandes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline des commandes</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PipelineCard label="En attente"     count={stats.en_attente}    color="bg-amber-50 text-amber-700 border border-amber-100" />
          <PipelineCard label="En préparation" count={stats.en_preparation} color="bg-blue-50 text-blue-700 border border-blue-100" />
          <PipelineCard label="En livraison"   count={stats.en_livraison}  color="bg-purple-50 text-purple-700 border border-purple-100" />
          <PipelineCard label="Livrées (aujourd'hui)" count={stats.livrees_today} color="bg-brand-50 text-brand-700 border border-brand-100" />
        </div>
      </div>

      {/* Alertes stock */}
      {(stats.ruptures_stock > 0 || stats.stock_faible > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-4">Alertes stock</p>
          <div className="flex flex-col gap-3">
            {stats.ruptures_stock > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-[14px] font-bold text-red-700">{stats.ruptures_stock} produit{stats.ruptures_stock > 1 ? "s" : ""} en rupture de stock</p>
                  <p className="text-[12px] text-red-500 font-medium">Réapprovisionnement requis immédiatement</p>
                </div>
              </div>
            )}
            {stats.stock_faible > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-[14px] font-bold text-amber-700">{stats.stock_faible} produit{stats.stock_faible > 1 ? "s" : ""} en stock faible (≤10 unités)</p>
                  <p className="text-[12px] text-amber-500 font-medium">Prévoir le réapprovisionnement</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
