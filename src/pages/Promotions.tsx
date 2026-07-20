import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, X, Check, Trash2, Ticket, Percent, Coins } from "lucide-react";
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from "../lib/db";
import type { PromoCode, DiscountType } from "../lib/supabase";
import { PageHeader } from "../components/Layout";

function fcfa(n: number) { return n.toLocaleString("fr-FR") + " FCFA"; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[17px] font-extrabold text-dark">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-dark"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const INPUT = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-dark focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// Conversion timestamptz <-> valeur d'input datetime-local
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function PromoForm({ initial, onSave, onClose }: {
  initial?: PromoCode;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    code:           initial?.code           ?? "",
    description:    initial?.description     ?? "",
    discount_type:  (initial?.discount_type  ?? "pourcentage") as DiscountType,
    discount_value: initial?.discount_value  ?? 10,
    min_order_fcfa: initial?.min_order_fcfa  ?? 0,
    max_uses:       initial?.max_uses        ?? ("" as number | ""),
    starts_at:      toLocalInput(initial?.starts_at  ?? null),
    expires_at:     toLocalInput(initial?.expires_at ?? null),
    is_active:      initial?.is_active       ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.code.trim().length < 3) { setError("Le code doit contenir au moins 3 caractères."); return; }
    if (form.discount_value <= 0)    { setError("La valeur de réduction doit être positive."); return; }
    if (form.discount_type === "pourcentage" && form.discount_value > 100) {
      setError("Un pourcentage ne peut pas dépasser 100."); return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        code:           form.code.trim().toUpperCase(),
        description:    form.description.trim() || null,
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_fcfa: Number(form.min_order_fcfa) || 0,
        max_uses:       form.max_uses === "" ? null : Number(form.max_uses),
        starts_at:      fromLocalInput(form.starts_at),
        expires_at:     fromLocalInput(form.expires_at),
        is_active:      form.is_active,
      };
      if (initial) await updatePromoCode(initial.id, payload);
      else         await createPromoCode(payload);
      onSave();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Code promo">
        <input
          required value={form.code}
          onChange={e => set("code", e.target.value.toUpperCase())}
          className={INPUT + " font-bold tracking-widest uppercase"}
          placeholder="ex: BIENVENUE10"
        />
      </Field>
      <Field label="Description (interne)">
        <input value={form.description} onChange={e => set("description", e.target.value)} className={INPUT} placeholder="ex: Offre de bienvenue" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type de réduction">
          <select value={form.discount_type} onChange={e => set("discount_type", e.target.value)} className={INPUT}>
            <option value="pourcentage">Pourcentage (%)</option>
            <option value="montant">Montant fixe (FCFA)</option>
          </select>
        </Field>
        <Field label={form.discount_type === "pourcentage" ? "Valeur (%)" : "Valeur (FCFA)"}>
          <input
            required type="number" min={1}
            max={form.discount_type === "pourcentage" ? 100 : undefined}
            value={form.discount_value}
            onChange={e => set("discount_value", +e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Commande minimum (FCFA)">
          <input type="number" min={0} value={form.min_order_fcfa} onChange={e => set("min_order_fcfa", +e.target.value)} className={INPUT} placeholder="0" />
        </Field>
        <Field label="Nombre max d'utilisations">
          <input
            type="number" min={1}
            value={form.max_uses}
            onChange={e => setForm(f => ({ ...f, max_uses: e.target.value === "" ? "" : +e.target.value }))}
            className={INPUT} placeholder="Illimité"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Début (optionnel)">
          <input type="datetime-local" value={form.starts_at} onChange={e => set("starts_at", e.target.value)} className={INPUT} />
        </Field>
        <Field label="Expiration (optionnel)">
          <input type="datetime-local" value={form.expires_at} onChange={e => set("expires_at", e.target.value)} className={INPUT} />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="promo_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded" />
        <label htmlFor="promo_active" className="text-[13px] font-semibold text-slate-600">Code actif</label>
      </div>

      {error && <p className="text-[13px] text-red-500 font-semibold">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-bold text-slate-500 hover:bg-slate-50 transition-all">Annuler</button>
        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold hover:bg-brand-600 transition-all disabled:opacity-60">
          {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le code"}
        </button>
      </div>
    </form>
  );
}

function statusOf(p: PromoCode): { label: string; cls: string } {
  const now = Date.now();
  if (!p.is_active) return { label: "Inactif", cls: "bg-slate-100 text-slate-500 border-slate-200" };
  if (p.expires_at && new Date(p.expires_at).getTime() < now) return { label: "Expiré", cls: "bg-red-50 text-red-500 border-red-200" };
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return { label: "Programmé", cls: "bg-amber-50 text-amber-600 border-amber-200" };
  if (p.max_uses != null && p.used_count >= p.max_uses) return { label: "Épuisé", cls: "bg-red-50 text-red-500 border-red-200" };
  return { label: "Actif", cls: "bg-brand-50 text-brand-600 border-brand-200" };
}

export default function Promotions() {
  const [promos, setPromos]   = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<PromoCode | null>(null);
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setPromos(await getPromoCodes()); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (p: PromoCode) => {
    await updatePromoCode(p.id, { is_active: !p.is_active });
    await load();
  };

  const handleDelete = async (p: PromoCode) => {
    if (!confirm(`Supprimer définitivement le code "${p.code}" ?`)) return;
    await deletePromoCode(p.id);
    await load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Promotions"
        subtitle={`${promos.length} code${promos.length !== 1 ? "s" : ""} promo`}
        action={
          <button
            onClick={() => { setSelected(null); setModal("create"); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-[13px] font-bold hover:bg-brand-600 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nouveau code
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 font-semibold">{error}</p>
      ) : (
        <div className="space-y-3">
          {promos.map(p => {
            const st = statusOf(p);
            return (
              <div key={p.id} className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-4 ${!p.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    {p.discount_type === "pourcentage"
                      ? <Percent className="w-5 h-5 text-brand-500" />
                      : <Coins className="w-5 h-5 text-brand-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-extrabold text-dark tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>{p.code}</p>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                    {p.description && <p className="text-[13px] text-slate-500 font-medium mt-0.5">{p.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-slate-500 font-medium">
                      <span className="font-bold text-brand-600">
                        {p.discount_type === "pourcentage" ? `-${p.discount_value}%` : `-${fcfa(p.discount_value)}`}
                      </span>
                      {p.min_order_fcfa > 0 && <span>Min. {fcfa(p.min_order_fcfa)}</span>}
                      <span>
                        {p.used_count} util.{p.max_uses != null ? ` / ${p.max_uses}` : ""}
                      </span>
                      {p.expires_at && <span>Expire le {new Date(p.expires_at).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setSelected(p); setModal("edit"); }} title="Modifier" className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggle(p)} title={p.is_active ? "Désactiver" : "Activer"} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${p.is_active ? "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500" : "bg-brand-50 text-brand-500 hover:bg-brand-100"}`}>
                      {p.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(p)} title="Supprimer" className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {promos.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-300">
              <Ticket className="w-12 h-12 mb-3" />
              <p className="text-[15px] font-bold text-slate-400">Aucun code promo</p>
              <p className="text-[13px] text-slate-300 mt-1">Créez votre première offre promotionnelle</p>
            </div>
          )}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? "Modifier le code promo" : "Nouveau code promo"} onClose={() => setModal(null)}>
          <PromoForm
            initial={modal === "edit" ? selected ?? undefined : undefined}
            onSave={load}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
