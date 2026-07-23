import { supabase } from "./supabase";
import type {
  AdminOrder, AdminProduct, Category, Supplier,
  Shop, DashboardStats, OrderStatus, PromoCode,
} from "./supabase";

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.from("v_admin_dashboard").select("*").single();
  if (error) throw new Error(error.message);
  return data as DashboardStats;
}

// ── Commandes ────────────────────────────────────────────────────────────────

export async function getOrders(filters?: {
  status?: OrderStatus;
  search?: string;
  from?: string;
  to?: string;
}): Promise<AdminOrder[]> {
  let q = supabase.from("v_admin_orders_detail").select("*");
  if (filters?.status)  q = q.eq("status", filters.status);
  if (filters?.from)    q = q.gte("created_at", filters.from);
  if (filters?.to)      q = q.lte("created_at", filters.to + "T23:59:59");
  if (filters?.search)  q = q.or(
    `shop_name.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`
  );
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminOrder[];
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id:   orderId,
    p_new_status: newStatus,
    p_note:       note ?? null,
  });
  if (error) throw new Error(error.message);
}

// ── Produits ─────────────────────────────────────────────────────────────────

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("v_admin_products")
    .select("*")
    .order("category_name")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminProduct[];
}

export async function createProduct(p: {
  category_id: number;
  name: string;
  packaging: string;
  unit: string;
  price_fcfa: number;
  description?: string;
  stock_qty?: number;
  image_url?: string;
}): Promise<void> {
  const { error } = await supabase.from("products").insert(p);
  if (error) throw new Error(error.message);
}

export async function updateProduct(id: number, p: Partial<{
  category_id: number;
  name: string;
  packaging: string;
  unit: string;
  price_fcfa: number;
  description: string;
  stock_qty: number;
  image_url: string;
  is_active: boolean;
}>): Promise<void> {
  const { error } = await supabase.from("products").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: number): Promise<void> {
  const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function receiveStock(
  productId: number,
  qty: number,
  supplierId?: number,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc("admin_receive_stock", {
    p_product_id:  productId,
    p_quantity:    qty,
    p_supplier_id: supplierId ?? null,
    p_note:        note ?? null,
  });
  if (error) throw new Error(error.message);
}

// ── Catégories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function createCategory(c: { name: string; slug: string; sort_order?: number }): Promise<void> {
  const { error } = await supabase.from("categories").insert(c);
  if (error) throw new Error(error.message);
}

export async function updateCategory(id: number, c: Partial<{ name: string; slug: string; sort_order: number; icon_url: string | null }>): Promise<void> {
  const { error } = await supabase.from("categories").update(c).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Nombre de produits par catégorie, indexé par category_id.
 * Sert à empêcher la suppression d'une catégorie non vide : products.category_id
 * est `on delete restrict`, la base refuserait avec une erreur peu lisible.
 */
export async function getCategoryProductCounts(): Promise<Record<number, number>> {
  const { data, error } = await supabase.from("products").select("category_id");
  if (error) throw new Error(error.message);
  const counts: Record<number, number> = {};
  (data ?? []).forEach((row: { category_id: number }) => {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  });
  return counts;
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    // 23503 = violation de clé étrangère : des produits pointent encore dessus.
    if (error.code === "23503") {
      throw new Error("Cette catégorie contient encore des produits. Déplacez-les avant de la supprimer.");
    }
    throw new Error(error.message);
  }
}

// ── Codes promo ──────────────────────────────────────────────────────────────

export async function getPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PromoCode[];
}

type PromoInput = {
  code:           string;
  description:    string | null;
  discount_type:  PromoCode["discount_type"];
  discount_value: number;
  min_order_fcfa: number;
  max_uses:       number | null;
  starts_at:      string | null;
  expires_at:     string | null;
  is_active:      boolean;
};

export async function createPromoCode(p: PromoInput): Promise<void> {
  const { error } = await supabase.from("promo_codes").insert(p);
  if (error) throw new Error(error.message);
}

export async function updatePromoCode(id: number, p: Partial<PromoInput>): Promise<void> {
  const { error } = await supabase.from("promo_codes").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePromoCode(id: number): Promise<void> {
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Fournisseurs ─────────────────────────────────────────────────────────────

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Supplier[];
}

export async function createSupplier(s: Omit<Supplier, "id" | "created_at" | "updated_at">): Promise<void> {
  const { error } = await supabase.from("suppliers").insert(s);
  if (error) throw new Error(error.message);
}

export async function updateSupplier(id: number, s: Partial<Supplier>): Promise<void> {
  const { error } = await supabase.from("suppliers").update(s).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSupplier(id: number): Promise<void> {
  const { error } = await supabase.from("suppliers").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Boutiques ────────────────────────────────────────────────────────────────

export async function getShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Shop[];
}

// ── Auth admin ───────────────────────────────────────────────────────────────

export async function adminSignIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function adminSignOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function isAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return !!admin;
}
