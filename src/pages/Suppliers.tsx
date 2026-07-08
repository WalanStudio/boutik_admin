import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Truck, Phone, Mail, MapPin, X, Check } from "lucide-react";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../lib/db";
import type { Supplier } from "../lib/supabase";
import { PageHeader } from "../components/Layout";

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

function SupplierForm({ initial, onSave, onClose }: {
  initial?: Supplier;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name:          initial?.name          ?? "",
    contact_name:  initial?.contact_name  ?? "",
    phone:         initial?.phone         ?? "",
    email:         initial?.email         ?? "",
    address:       initial?.address       ?? "",
    city:          initial?.city          ?? "Abidjan",
    country:       initial?.country       ?? "Côte d'Ivoire",
    payment_terms: initial?.payment_terms ?? "",
    notes:         initial?.notes         ?? "",
    is_active:     initial?.is_active     ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (initial) {
        await updateSupplier(initial.id, form);
      } else {
        await createSupplier(form as Omit<Supplier, "id" | "created_at" | "updated_at">);
      }
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
      <Field label="Nom du fournisseur">
        <input required value={form.name} onChange={e => set("name", e.target.value)} className={INPUT} placeholder="ex: CDCI Boissons" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact">
          <input value={form.contact_name ?? ""} onChange={e => set("contact_name", e.target.value)} className={INPUT} placeholder="Nom du représentant" />
        </Field>
        <Field label="Téléphone">
          <input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} className={INPUT} placeholder="+225 07 …" />
        </Field>
      </div>
      <Field label="Email">
        <input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} className={INPUT} placeholder="contact@fournisseur.ci" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adresse">
          <input value={form.address ?? ""} onChange={e => set("address", e.target.value)} className={INPUT} placeholder="Rue / Zone…" />
        </Field>
        <Field label="Ville">
          <input value={form.city ?? ""} onChange={e => set("city", e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Conditions de paiement">
        <input value={form.payment_terms ?? ""} onChange={e => set("payment_terms", e.target.value)} className={INPUT} placeholder="ex: 30 jours net, comptant…" />
      </Field>
      <Field label="Notes internes">
        <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} className={INPUT + " resize-none h-16"} placeholder="Informations complémentaires…" />
      </Field>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="sup_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded" />
        <label htmlFor="sup_active" className="text-[13px] font-semibold text-slate-600">Fournisseur actif</label>
      </div>
      {error && <p className="text-[13px] text-red-500 font-semibold">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-bold text-slate-500 hover:bg-slate-50 transition-all">Annuler</button>
        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold hover:bg-brand-600 transition-all disabled:opacity-60">
          {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer"}
        </button>
      </div>
    </form>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<"create" | "edit" | null>(null);
  const [selected, setSelected]   = useState<Supplier | null>(null);
  const [error, setError]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setSuppliers(await getSuppliers()); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (s: Supplier) => {
    await updateSupplier(s.id, { is_active: !s.is_active });
    await load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur${suppliers.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => { setSelected(null); setModal("create"); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-[13px] font-bold hover:bg-brand-600 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nouveau fournisseur
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
        <span className="text-[12px] font-semibold text-amber-700">🔒 Cette section est uniquement visible par les admins — jamais exposée aux clients.</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 font-semibold">{error}</p>
      ) : (
        <div className="space-y-3">
          {suppliers.map(s => (
            <div key={s.id} className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-4 transition-opacity ${!s.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[15px] font-bold text-dark">{s.name}</p>
                    {!s.is_active && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">Inactif</span>}
                  </div>
                  {s.contact_name && <p className="text-[13px] text-slate-500 font-medium mt-0.5">{s.contact_name}</p>}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {s.phone && (
                      <span className="flex items-center gap-1 text-[12px] text-slate-500 font-medium">
                        <Phone className="w-3 h-3" />{s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1 text-[12px] text-slate-500 font-medium">
                        <Mail className="w-3 h-3" />{s.email}
                      </span>
                    )}
                    {s.city && (
                      <span className="flex items-center gap-1 text-[12px] text-slate-500 font-medium">
                        <MapPin className="w-3 h-3" />{s.city}
                      </span>
                    )}
                    {s.payment_terms && (
                      <span className="text-[12px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                        {s.payment_terms}
                      </span>
                    )}
                  </div>
                  {s.notes && <p className="text-[12px] text-slate-400 mt-1.5 italic">{s.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => { setSelected(s); setModal("edit"); }} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleToggle(s)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${s.is_active ? "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500" : "bg-brand-50 text-brand-500 hover:bg-brand-100"}`}>
                    {s.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-300">
              <Truck className="w-12 h-12 mb-3" />
              <p className="text-[15px] font-bold text-slate-400">Aucun fournisseur enregistré</p>
            </div>
          )}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? "Modifier le fournisseur" : "Nouveau fournisseur"} onClose={() => setModal(null)}>
          <SupplierForm
            initial={modal === "edit" ? selected ?? undefined : undefined}
            onSave={load}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
