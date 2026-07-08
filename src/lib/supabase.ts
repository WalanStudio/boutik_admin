import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL  as string;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

// ── Types miroirs du schéma Supabase ─────────────────────────────────────────

export type AdminRole          = "super_admin" | "gestionnaire" | "livreur";
export type OrderStatus        = "en_attente" | "confirmée" | "en_préparation" | "en_livraison" | "livrée" | "annulée";
export type PaymentMethod      = "à_la_livraison" | "mobile_money" | "virement";
export type StockMovementType  = "entrée" | "sortie_vente" | "ajustement" | "retour";

export interface AdminUser {
  id:         string;
  user_id:    string;
  role:       AdminRole;
  full_name:  string;
  created_at: string;
}

export interface Category {
  id:         number;
  name:       string;
  slug:       string;
  icon_url:   string | null;
  sort_order: number;
}

export interface Supplier {
  id:            number;
  name:          string;
  contact_name:  string | null;
  phone:         string | null;
  email:         string | null;
  address:       string | null;
  city:          string | null;
  country:       string;
  payment_terms: string | null;
  notes:         string | null;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string;
}

export interface Product {
  id:           number;
  category_id:  number;
  name:         string;
  packaging:    string;
  unit:         string;
  price_fcfa:   number;
  description:  string | null;
  stock_qty:    number;
  image_url:    string | null;
  is_active:    boolean;
  created_at:   string;
  updated_at:   string;
  categories?:  { name: string; slug: string };
}

export interface AdminProduct extends Product {
  category_name:  string;
  category_slug:  string;
  supplier_id:    number | null;
  supplier_name:  string | null;
  supplier_phone: string | null;
  purchase_price: number | null;
  lead_time_days: number | null;
  min_order_qty:  number | null;
  supplier_ref:   string | null;
  margin_pct:     number | null;
  sold_last_30d:  number | null;
}

export interface Shop {
  id:            string;
  user_id:       string;
  name:          string;
  phone:         string;
  location_text: string | null;
  latitude:      number | null;
  longitude:     number | null;
  created_at:    string;
}

export interface OrderItem {
  product_id:   number;
  product_name: string;
  category:     string;
  packaging:    string;
  quantity:     number;
  unit_price:   number;
  subtotal:     number;
}

export interface StatusHistoryEntry {
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  note:       string | null;
  changed_at: string;
}

export interface AdminOrder {
  id:              string;
  order_number:    string;
  status:          OrderStatus;
  payment_method:  PaymentMethod;
  delivery_date:   string;
  delivery_address: string | null;
  total_fcfa:      number;
  notes:           string | null;
  created_at:      string;
  updated_at:      string;
  shop_id:         string;
  shop_name:       string;
  shop_phone:      string;
  shop_address:    string | null;
  latitude:        number | null;
  longitude:       number | null;
  nb_lignes:       number;
  nb_articles:     number;
  items:           OrderItem[];
  status_history:  StatusHistoryEntry[];
}

export interface DashboardStats {
  commandes_today:   number;
  ca_today:          number;
  en_attente:        number;
  en_preparation:    number;
  en_livraison:      number;
  livrees_today:     number;
  total_boutiques:   number;
  produits_actifs:   number;
  ruptures_stock:    number;
  stock_faible:      number;
  fournisseurs_actifs: number;
}
