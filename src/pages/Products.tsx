import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus, Search, X, Pencil, Package,
  ChevronDown, ChevronUp, Truck, AlertTriangle, Check,
} from "lucide-react";
import {
  getAdminProducts, getCategories, getSuppliers,
  createProduct, updateProduct, deleteProduct, receiveStock,
} from "../lib/db";
import type { AdminProduct, Category, Supplier } from "../lib/supabase";
import { PageHeader } from "../components/Layout";

function fcfa(n: number) { return n.toLocaleString("fr-FR") + " FCFA"; }

// ── Modal générique ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[17px] font-extrabold text-dark">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-dark transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-dark focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";

// ── Formulaire Produit ────────────────────────────────────────────────────────
function ProductForm({
  initial, categories, suppliers, onSave, onClose,
}: {
  initial?: AdminProduct;
  categories: Category[];
  suppliers: Supplier[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    category_id:  initial?.category_id  ?? (categories[0]?.id ?? 0),
    name:         initial?.name         ?? "",
    packaging:    initial?.packaging    ?? "",
    unit:         initial?.unit         ?? "carton",
    price_fcfa:   initial?.price_fcfa   ?? 0,
    stock_qty:    initial?.stock_qty    ?? 0,
    description:  initial?.description  ?? "",
    image_url:    initial?.image_url    ?? "",
    is_active:    initial?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (initial) {
        await updateProduct(initial.id, form);
      } else {
        await createProduct(form);
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
      <Field label="Catégorie">
        <select value={form.category_id} onChange={e => set("category_id", +e.target.value)} className={INPUT}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Nom du produit">
        <input required value={form.name} onChange={e => set("name", e.target.value)} className={INPUT} placeholder="ex: Eau minérale naturelle" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Conditionnement">
          <input required value={form.packaging} onChange={e => set("packaging", e.target.value)} className={INPUT} placeholder="ex: Carton 24×1,5L" />
        </Field>
        <Field label="Unité">
          <input required value={form.unit} onChange={e => set("unit", e.target.value)} className={INPUT} placeholder="ex: carton" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix de vente (FCFA)">
          <input required type="number" min={0} value={form.price_fcfa} onChange={e => set("price_fcfa", +e.target.value)} className={INPUT} />
        </Field>
        <Field label="Stock initial">
          <input required type="number" min={0} value={form.stock_qty} onChange={e => set("stock_qty", +e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Description">
        <textarea value={form.description} onChange={e => set("description", e.target.value)} className={INPUT + " resize-none h-20"} placeholder="Description courte…" />
      </Field>
      <Field label="URL image">
        <input value={form.image_url} onChange={e => set("image_url", e.target.value)} className={INPUT} placeholder="https://…" />
      </Field>
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded" />
        <label htmlFor="is_active" className="text-[13px] font-semibold text-slate-600">Produit actif (visible dans l'app)</label>
      </div>
      {error && <p className="text-[13px] text-red-500 font-semibold">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-bold text-slate-500 hover:bg-slate-50 transition-all">Annuler</button>
        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold hover:bg-brand-600 transition-all disabled:opacity-60">
          {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le produit"}
        </button>
      </div>
    </form>
  );
}

// ── Modal réception stock ─────────────────────────────────────────────────────
function StockModal({ product, suppliers, onSave, onClose }: {
  product: AdminProduct;
  suppliers: Supplier[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [qty, setQty]         = useState(1);
  const [suppId, setSuppId]   = useState<number | "">(product.supplier_id ?? "");
  const [note, setNote]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await receiveStock(product.id, qty, suppId !== "" ? suppId : undefined, note || undefined);
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
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
        <Package className="w-5 h-5 text-brand-500 shrink-0" />
        <div>
          <p className="text-[14px] font-bold text-dark">{product.name}</p>
          <p className="text-[12px] text-slate-400">Stock actuel : <strong>{product.stock_qty}</strong> {product.unit}s</p>
        </div>
      </div>
      <Field label="Quantité reçue">
        <input required type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} className={INPUT} />
      </Field>
      <Field label="Fournisseur">
        <select value={suppId} onChange={e => setSuppId(e.target.value !== "" ? +e.target.value : "")} className={INPUT}>
          <option value="">— Sans fournisseur —</option>
          {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Note (optionnel)">
        <input value={note} onChange={e => setNote(e.target.value)} className={INPUT} placeholder="ex: BL n°1234" />
      </Field>
      {error && <p className="text-[13px] text-red-500 font-semibold">{error}</p>}
      <p className="text-[12px] text-slate-400 font-medium">
        Nouveau stock après réception : <strong className="text-dark">{product.stock_qty + qty} {product.unit}s</strong>
      </p>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-bold text-slate-500 hover:bg-slate-50 transition-all">Annuler</button>
        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold hover:bg-brand-600 transition-all disabled:opacity-60">
          {saving ? "Enregistrement…" : "Confirmer réception"}
        </button>
      </div>
    </form>
  );
}

// ── Ligne produit ─────────────────────────────────────────────────────────────
function ProductRow({
  product, suppliers,
  onEdit, onStock, onToggle,
}: {
  product: AdminProduct;
  suppliers: Supplier[];
  onEdit: (p: AdminProduct) => void;
  onStock: (p: AdminProduct) => void;
  onToggle: (p: AdminProduct) => void;
}) {
  const stockColor = product.stock_qty === 0
    ? "text-red-600 bg-red-50"
    : product.stock_qty <= 10
    ? "text-amber-600 bg-amber-50"
    : "text-brand-700 bg-brand-50";

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-opacity ${!product.is_active ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 p-4">
        {/* Image */}
        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-slate-300" /></div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-dark truncate">{product.name}</p>
          <p className="text-[12px] text-slate-400 font-medium">{product.packaging}</p>
          {product.supplier_name && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Truck className="w-3 h-3" />{product.supplier_name}
            </p>
          )}
        </div>

        {/* Prix */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[15px] font-extrabold text-dark" style={{ fontFamily: "'DM Mono', monospace" }}>{fcfa(product.price_fcfa)}</p>
          {product.margin_pct !== null && (
            <p className="text-[11px] text-brand-600 font-bold">Marge {product.margin_pct}%</p>
          )}
        </div>

        {/* Stock */}
        <div className={`px-3 py-1.5 rounded-xl text-[12px] font-bold shrink-0 ${stockColor}`}>
          {product.stock_qty} {product.unit}s
          {product.stock_qty === 0 && <span className="ml-1">⚠️</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onStock(product)}
            title="Réception stock"
            className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => onEdit(product)}
            title="Modifier"
            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggle(product)}
            title={product.is_active ? "Désactiver" : "Activer"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${product.is_active ? "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500" : "bg-brand-50 text-brand-500 hover:bg-brand-100"}`}
          >
            {product.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section catégorie (repliable) ─────────────────────────────────────────────
function CategorySection({
  name, products, open, onToggleOpen, children,
}: {
  name: string;
  products: AdminProduct[];
  open: boolean;
  onToggleOpen: () => void;
  children: React.ReactNode;
}) {
  const ruptures = products.filter(p => p.stock_qty === 0 && p.is_active).length;

  return (
    <section>
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors sticky top-0 z-10"
      >
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
        <h2 className="text-[14px] font-extrabold text-dark truncate">{name}</h2>
        <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-500 shrink-0">
          {products.length}
        </span>
        {ruptures > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-[11px] font-bold text-red-600 shrink-0">
            <AlertTriangle className="w-3 h-3" />
            {ruptures} en rupture
          </span>
        )}
      </button>
      {open && <div className="space-y-2 mt-2 mb-5">{children}</div>}
    </section>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Products() {
  const [products, setProducts]       = useState<AdminProduct[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState<string>("");
  const [closed, setClosed]           = useState<Set<string>>(new Set());
  const [showModal, setShowModal]     = useState<"create" | "edit" | "stock" | null>(null);
  const [selected, setSelected]       = useState<AdminProduct | null>(null);
  const [error, setError]             = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats, supps] = await Promise.all([
        getAdminProducts(), getCategories(), getSuppliers(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(supps);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === "" || p.category_slug === catFilter;
    return matchSearch && matchCat;
  });

  // Regroupement par catégorie, dans l'ordre d'affichage des catégories (sort_order)
  const groups = useMemo(() => {
    const byCat = new Map<string, AdminProduct[]>();
    for (const p of filtered) {
      const list = byCat.get(p.category_slug);
      if (list) list.push(p);
      else byCat.set(p.category_slug, [p]);
    }
    const ordered = categories
      .filter(c => byCat.has(c.slug))
      .map(c => ({ slug: c.slug, name: c.name, items: byCat.get(c.slug)! }));

    // Catégories présentes sur un produit mais absentes de la table (sécurité)
    const known = new Set(categories.map(c => c.slug));
    for (const [slug, items] of byCat) {
      if (!known.has(slug)) ordered.push({ slug, name: items[0].category_name, items });
    }
    return ordered;
  }, [filtered, categories]);

  const handleToggle = async (p: AdminProduct) => {
    await updateProduct(p.id, { is_active: !p.is_active });
    await load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Produits"
        subtitle={`${products.length} produit${products.length !== 1 ? "s" : ""} · ${groups.length} catégorie${groups.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => { setSelected(null); setShowModal("create"); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-[13px] font-bold hover:bg-brand-600 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nouveau produit
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-300 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="flex-1 bg-transparent text-[13px] placeholder-slate-300 focus:outline-none" />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-300" /></button>}
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 focus:outline-none">
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button
          onClick={() => setClosed(c => (c.size > 0 ? new Set() : new Set(groups.map(g => g.slug))))}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          {closed.size > 0 ? "Tout déplier" : "Tout replier"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 font-semibold p-4">{error}</p>
      ) : (
        <div>
          {groups.map(g => (
            <CategorySection
              key={g.slug}
              name={g.name}
              products={g.items}
              open={!closed.has(g.slug)}
              onToggleOpen={() => setClosed(prev => {
                const next = new Set(prev);
                if (next.has(g.slug)) next.delete(g.slug);
                else next.add(g.slug);
                return next;
              })}
            >
              {g.items.map(p => (
                <ProductRow
                  key={p.id} product={p} suppliers={suppliers}
                  onEdit={p => { setSelected(p); setShowModal("edit"); }}
                  onStock={p => { setSelected(p); setShowModal("stock"); }}
                  onToggle={handleToggle}
                />
              ))}
            </CategorySection>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-300">
              <Package className="w-12 h-12 mb-3" />
              <p className="text-[15px] font-bold text-slate-400">Aucun produit trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(showModal === "create" || showModal === "edit") && (
        <Modal title={showModal === "edit" ? "Modifier le produit" : "Nouveau produit"} onClose={() => setShowModal(null)}>
          <ProductForm
            initial={showModal === "edit" ? selected ?? undefined : undefined}
            categories={categories}
            suppliers={suppliers}
            onSave={load}
            onClose={() => setShowModal(null)}
          />
        </Modal>
      )}
      {showModal === "stock" && selected && (
        <Modal title="Réception de stock" onClose={() => setShowModal(null)}>
          <StockModal product={selected} suppliers={suppliers} onSave={load} onClose={() => setShowModal(null)} />
        </Modal>
      )}
    </div>
  );
}
