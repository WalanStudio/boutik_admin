import React, { useEffect, useState, useCallback } from "react";
import {
  Search, Filter, ChevronDown, ChevronUp, RefreshCw,
  MapPin, Calendar, CreditCard, Package, Clock, Check, Truck, X,
} from "lucide-react";
import { getOrders, updateOrderStatus } from "../lib/db";
import type { AdminOrder, OrderStatus } from "../lib/supabase";
import { PageHeader } from "../components/Layout";

const STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente:       "En attente",
  confirmée:        "Confirmée",
  "en_préparation": "En préparation",
  en_livraison:     "En livraison",
  livrée:           "Livrée",
  annulée:          "Annulée",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  en_attente:       "bg-amber-50 text-amber-700 border-amber-200",
  confirmée:        "bg-blue-50 text-blue-700 border-blue-200",
  "en_préparation": "bg-purple-50 text-purple-700 border-purple-200",
  en_livraison:     "bg-indigo-50 text-indigo-700 border-indigo-200",
  livrée:           "bg-brand-50 text-brand-700 border-brand-100",
  annulée:          "bg-red-50 text-red-700 border-red-200",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  en_attente:       ["confirmée", "annulée"],
  confirmée:        ["en_préparation", "annulée"],
  "en_préparation": ["en_livraison", "annulée"],
  en_livraison:     ["livrée", "annulée"],
};

function fcfa(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function OrderRow({
  order,
  onStatusChange,
}: {
  order: AdminOrder;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [showActions, setShowActions] = useState(false);
  const nexts = NEXT_STATUS[order.status] ?? [];

  const handleStatus = async (s: OrderStatus) => {
    setUpdating(true);
    setShowActions(false);
    await onStatusChange(order.id, s);
    setUpdating(false);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-dark" style={{ fontFamily: "'DM Mono', monospace" }}>
              {order.order_number}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5 truncate">{order.shop_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[15px] font-extrabold text-dark" style={{ fontFamily: "'DM Mono', monospace" }}>
            {fcfa(order.total_fcfa)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Infos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-0.5">Livraison</p>
                <p className="font-bold text-dark">{order.delivery_address ?? order.shop_address ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-0.5">Date prévue</p>
                <p className="font-bold text-dark">
                  {new Date(order.delivery_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-0.5">Paiement</p>
                <p className="font-bold text-dark capitalize">{order.payment_method.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* Produits */}
          {order.items && order.items.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Produits</p>
              <div className="space-y-1.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-[13px] font-bold text-dark">{item.product_name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{item.packaging} · {item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-dark">{fcfa(item.subtotal)}</p>
                      <p className="text-[11px] text-slate-400">{item.quantity} × {fcfa(item.unit_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique statuts */}
          {order.status_history && order.status_history.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Historique</p>
              <div className="space-y-1">
                {order.status_history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-slate-500">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{new Date(h.changed_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span>→</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full border text-[11px] ${STATUS_COLORS[h.new_status]}`}>
                      {STATUS_LABELS[h.new_status]}
                    </span>
                    {h.note && <span className="text-slate-400 italic">"{h.note}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {nexts.length > 0 && (
            <div className="flex gap-2 pt-2 border-t border-slate-100 flex-wrap">
              {nexts.map(s => (
                <button
                  key={s}
                  disabled={updating}
                  onClick={() => handleStatus(s)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50 ${
                    s === "annulée"
                      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      : "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"
                  }`}
                >
                  {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ALL_STATUSES: OrderStatus[] = ["en_attente", "confirmée", "en_préparation", "en_livraison", "livrée", "annulée"];

export default function Orders() {
  const [orders, setOrders]     = useState<AdminOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState<OrderStatus | "">("");
  const [error, setError]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrders({ status: status || undefined, search: search || undefined });
      setOrders(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, s: OrderStatus) => {
    await updateOrderStatus(id, s);
    await load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Commandes"
        subtitle={`${orders.length} commande${orders.length !== 1 ? "s" : ""}`}
        action={
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-300 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Boutique, N° commande…"
            className="flex-1 bg-transparent text-[13px] placeholder-slate-300 focus:outline-none"
          />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-300" /></button>}
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as OrderStatus | "")}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">Tous les statuts</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 font-semibold p-4">{error}</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-[15px] font-bold text-slate-400">Aucune commande trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <OrderRow key={o.id} order={o} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingCart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}
