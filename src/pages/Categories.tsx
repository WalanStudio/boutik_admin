import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, X, Package, GripVertical } from "lucide-react";
import { getCategories, createCategory, updateCategory } from "../lib/db";
import type { Category } from "../lib/supabase";
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

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function CategoryForm({ initial, existing, onSave, onClose }: {
  initial?: Category;
  existing: Category[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name:       initial?.name       ?? "",
    slug:       initial?.slug       ?? "",
    icon_url:   initial?.icon_url   ?? "",
    sort_order: initial?.sort_order ?? (existing.length + 1),
  });
  // Suivre si le slug a été édité manuellement (sinon on l'auto-génère depuis le nom)
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const setName = (v: string) =>
    setForm(f => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError("Le nom doit contenir au moins 2 caractères."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug.trim() || slugify(form.name)),
        icon_url: form.icon_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (initial) await updateCategory(initial.id, payload);
      else         await createCategory(payload);
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
      <Field label="Nom de la catégorie">
        <input required value={form.name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="ex: Boissons" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Slug (identifiant)">
          <input
            value={form.slug}
            onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
            className={INPUT}
            placeholder="ex: boissons"
          />
        </Field>
        <Field label="Ordre d'affichage">
          <input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} className={INPUT} />
        </Field>
      </div>
      <Field label="URL de l'image (vignette)">
        <input value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} className={INPUT} placeholder="https://…" />
      </Field>
      {form.icon_url.trim() && (
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
            <img src={form.icon_url} alt="Aperçu" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <span className="text-[12px] text-slate-400 font-medium">Aperçu de la vignette</span>
        </div>
      )}
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

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState<"create" | "edit" | null>(null);
  const [selected, setSelected]     = useState<Category | null>(null);
  const [error, setError]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCategories(await getCategories()); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Catégories"
        subtitle={`${categories.length} catégorie${categories.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => { setSelected(null); setModal("create"); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-[13px] font-bold hover:bg-brand-600 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nouvelle catégorie
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
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3 flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
              <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {c.icon_url
                  ? <img src={c.icon_url} alt={c.name} className="w-full h-full object-cover" />
                  : <Package className="w-5 h-5 text-slate-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-dark truncate">{c.name}</p>
                <p className="text-[12px] text-slate-400 font-medium">/{c.slug}</p>
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                #{c.sort_order}
              </span>
              <button
                onClick={() => { setSelected(c); setModal("edit"); }}
                title="Renommer / modifier"
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-300">
              <Package className="w-12 h-12 mb-3" />
              <p className="text-[15px] font-bold text-slate-400">Aucune catégorie</p>
            </div>
          )}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? "Modifier la catégorie" : "Nouvelle catégorie"} onClose={() => setModal(null)}>
          <CategoryForm
            initial={modal === "edit" ? selected ?? undefined : undefined}
            existing={categories}
            onSave={load}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
