import React, { useEffect, useState, useCallback } from "react";
import { Search, X, Store, Phone, MapPin } from "lucide-react";
import { getShops } from "../lib/db";
import type { Shop } from "../lib/supabase";
import { PageHeader } from "../components/Layout";

export default function Shops() {
  const [shops, setShops]   = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setShops(await getShops()); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Boutiques clients"
        subtitle={`${shops.length} boutique${shops.length !== 1 ? "s" : ""} enregistrée${shops.length !== 1 ? "s" : ""}`}
      />

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-5">
        <Search className="w-4 h-4 text-slate-300 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Nom de boutique ou téléphone…"
          className="flex-1 bg-transparent text-[13px] placeholder-slate-300 focus:outline-none"
        />
        {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-300" /></button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 font-semibold">{error}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-dark truncate">{s.name}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[12px] text-slate-500 font-medium">
                    <Phone className="w-3 h-3" />{s.phone}
                  </span>
                  {s.location_text && (
                    <span className="flex items-center gap-1 text-[12px] text-slate-500 font-medium">
                      <MapPin className="w-3 h-3" />{s.location_text}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium shrink-0">
                {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-300">
              <Store className="w-12 h-12 mb-3" />
              <p className="text-[15px] font-bold text-slate-400">Aucune boutique trouvée</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
