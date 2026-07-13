-- ============================================================
--  MarketPro Admin — correctifs sur admin.sql
--  À exécuter dans le SQL Editor Supabase, APRÈS admin.sql.
--
--  Idempotent : rejouable sans risque. Ne recrée AUCUNE table,
--  donc les admins, fournisseurs et journaux existants sont
--  préservés (ré-exécuter admin.sql, lui, les détruirait).
--
--  PRÉREQUIS : la section 4 lit orders.subtotal_fcfa et
--  orders.service_fee_fcfa. Jouer d'abord service_fee.sql du dépôt
--  de l'app client, sinon ce script échouera sur des colonnes absentes.
--
--  Corrige quatre défauts :
--    1. Les vues admin contournent RLS → fuite vers les commerçants
--    2. admin_update_order_status journalise un mauvais old_status
--    3. Les ventes ne sont jamais tracées dans stock_movements
--    4. Les vues ignorent les frais de service
-- ============================================================


-- ============================================================
-- 1. FUITE DE DONNÉES : les vues admin ignoraient RLS
-- ------------------------------------------------------------
-- Une vue Postgres s'exécute par défaut avec les droits de son
-- PROPRIÉTAIRE (security_invoker = off) : elle court-circuite donc
-- les policies de celui qui l'interroge. Or Supabase accorde `select`
-- sur les objets de `public` au rôle `authenticated`.
--
-- Conséquence : n'importe quel COMMERÇANT connecté pouvait lire
-- v_admin_products (prix d'achat fournisseurs, marges) et
-- v_admin_orders_detail (les commandes de TOUTES les boutiques).
--
-- security_invoker = on → la vue applique les policies de l'appelant :
--   • admin      : is_admin() ⇒ voit tout, comme avant
--   • commerçant : ne voit que ses propres lignes (RLS de base)
--   • anon       : ne voit rien
-- ============================================================
alter view v_admin_products      set (security_invoker = on);
alter view v_admin_orders_detail set (security_invoker = on);
alter view v_admin_dashboard     set (security_invoker = on);

-- Ceinture et bretelles : le rôle anonyme n'a rien à faire ici.
revoke all on v_admin_products      from anon;
revoke all on v_admin_orders_detail from anon;
revoke all on v_admin_dashboard     from anon;


-- ============================================================
-- 2. JOURNAL DES STATUTS : old_status était faux
-- ------------------------------------------------------------
-- L'ancienne version écrasait v_order avec le RETURNING de l'UPDATE
-- avant de journaliser : old_status recevait donc le NOUVEAU statut,
-- et l'historique affichait des transitions « livrée → livrée ».
-- On capture désormais l'ancien statut AVANT la mise à jour.
-- ============================================================
create or replace function admin_update_order_status(
  p_order_id   uuid,
  p_new_status order_status,
  p_note       text default null
)
returns orders
language plpgsql
security definer
as $$
declare
  v_order      orders;
  v_old_status order_status;
begin
  if not is_admin() then
    raise exception 'Accès refusé : rôle admin requis';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande % introuvable', p_order_id;
  end if;

  -- Capturé AVANT l'update : c'est tout le correctif.
  v_old_status := v_order.status;

  if v_old_status = 'annulée' then
    raise exception 'Impossible de modifier une commande annulée';
  end if;
  if v_old_status = 'livrée' and p_new_status != 'annulée' then
    raise exception 'Une commande livrée ne peut être que marquée annulée (pour retour)';
  end if;

  update orders set status = p_new_status where id = p_order_id
  returning * into v_order;

  insert into order_status_history (order_id, old_status, new_status, changed_by, note)
  values (p_order_id, v_old_status, p_new_status, auth.uid(), p_note);

  return v_order;
end;
$$;

comment on function admin_update_order_status is
  'Admin : change le statut d''une commande avec traçabilité. Vérifie les transitions valides.';


-- ============================================================
-- 3. VENTES NON TRACÉES : stock_movements ignorait les commandes
-- ------------------------------------------------------------
-- place_order décrémente le stock mais n'a jamais écrit de mouvement
-- 'sortie_vente'. La colonne sold_last_30d du dashboard restait donc
-- vide, et le journal de stock était incomplet (entrées seulement).
--
-- On journalise via un trigger sur order_items plutôt qu'en modifiant
-- place_order : la table stock_movements appartient au domaine admin,
-- et l'app client ne doit pas avoir à la connaître.
--
-- Le trigger s'exécute à l'insertion de la ligne, donc AVANT que
-- place_order ne décrémente products.stock_qty : stock_before est
-- bien l'état d'avant-vente.
-- ============================================================
create or replace function log_stock_sale()
returns trigger
language plpgsql
security definer
as $$
declare
  v_before int;
begin
  select stock_qty into v_before from products where id = new.product_id;

  insert into stock_movements (
    product_id, movement_type, quantity,
    stock_before, stock_after,
    order_id, performed_by, note
  ) values (
    new.product_id, 'sortie_vente', -new.quantity,
    v_before, v_before - new.quantity,
    new.order_id, auth.uid(), 'Vente (commande client)'
  );

  return new;
end;
$$;

comment on function log_stock_sale is
  'Trace chaque ligne de commande comme une sortie de stock (quantité négative)';

drop trigger if exists trg_log_stock_sale on order_items;
create trigger trg_log_stock_sale
  after insert on order_items
  for each row execute function log_stock_sale();


-- ============================================================
-- 4. FRAIS DE SERVICE : absents des vues admin
-- ------------------------------------------------------------
-- orders porte désormais subtotal_fcfa + service_fee_fcfa (cf. le dépôt
-- de l'app client : supabase/service_fee.sql). Les vues agrégeaient
-- produits et frais sans distinction.
--
-- Note : sold_last_30d est corrigé au passage. stock_movements.quantity
-- est NÉGATIF pour une sortie, la somme brute donnait donc un nombre
-- de ventes négatif.
-- ============================================================
create or replace view v_admin_products as
select
  p.id,
  p.name,
  p.packaging,
  p.unit,
  p.price_fcfa,
  p.stock_qty,
  p.is_active,
  p.created_at,
  p.updated_at,
  c.name                  as category_name,
  c.slug                  as category_slug,
  s.id                    as supplier_id,
  s.name                  as supplier_name,
  s.phone                 as supplier_phone,
  ps.purchase_price,
  ps.lead_time_days,
  ps.min_order_qty,
  ps.supplier_ref,
  case
    when ps.purchase_price is not null and ps.purchase_price > 0
    then round(((p.price_fcfa - ps.purchase_price)::numeric / ps.purchase_price) * 100, 1)
    else null
  end                     as margin_pct,
  coalesce((
    select -sum(sm.quantity)
    from stock_movements sm
    where sm.product_id = p.id
      and sm.movement_type = 'sortie_vente'
      and sm.created_at >= now() - interval '30 days'
  ), 0)                   as sold_last_30d
from products p
join categories c on c.id = p.category_id
left join product_suppliers ps on ps.product_id = p.id and ps.is_preferred = true
left join suppliers s on s.id = ps.supplier_id
order by c.sort_order, p.name;

alter view v_admin_products set (security_invoker = on);


create or replace view v_admin_orders_detail as
select
  o.id,
  o.order_number,
  o.status,
  o.payment_method,
  o.delivery_date,
  o.delivery_address,
  o.total_fcfa,
  o.notes,
  o.created_at,
  o.updated_at,
  sh.id             as shop_id,
  sh.name           as shop_name,
  sh.phone          as shop_phone,
  sh.location_text  as shop_address,
  sh.latitude,
  sh.longitude,
  count(oi.id)      as nb_lignes,
  sum(oi.quantity)  as nb_articles,
  (
    select json_agg(
      json_build_object(
        'product_id',   oi2.product_id,
        'product_name', p2.name,
        'category',     cat2.name,
        'packaging',    p2.packaging,
        'quantity',     oi2.quantity,
        'unit_price',   oi2.unit_price,
        'subtotal',     oi2.subtotal
      ) order by oi2.id
    )
    from order_items oi2
    join products p2 on p2.id = oi2.product_id
    join categories cat2 on cat2.id = p2.category_id
    where oi2.order_id = o.id
  )                 as items,
  (
    select json_agg(
      json_build_object(
        'old_status', osh.old_status,
        'new_status', osh.new_status,
        'note',       osh.note,
        'changed_at', osh.created_at
      ) order by osh.created_at
    )
    from order_status_history osh
    where osh.order_id = o.id
  )                 as status_history,
  -- Nouvelles colonnes, ajoutées EN FIN de vue (contrainte de create or replace)
  o.subtotal_fcfa,
  o.service_fee_fcfa
from orders o
join shops sh on sh.id = o.shop_id
left join order_items oi on oi.order_id = o.id
group by o.id, o.order_number, o.status, o.payment_method, o.delivery_date,
         o.delivery_address, o.total_fcfa, o.notes, o.created_at, o.updated_at,
         o.subtotal_fcfa, o.service_fee_fcfa,
         sh.id, sh.name, sh.phone, sh.location_text, sh.latitude, sh.longitude
order by o.created_at desc;

alter view v_admin_orders_detail set (security_invoker = on);


create or replace view v_admin_dashboard as
select
  (select count(*) from orders where created_at::date = current_date)        as commandes_today,
  (select coalesce(sum(total_fcfa),0) from orders where created_at::date = current_date)
                                                                              as ca_today,
  (select count(*) from orders where status = 'en_attente')                  as en_attente,
  (select count(*) from orders where status = 'en_préparation')              as en_preparation,
  (select count(*) from orders where status = 'en_livraison')                as en_livraison,
  (select count(*) from orders where status = 'livrée' and updated_at::date = current_date)
                                                                              as livrees_today,
  (select count(*) from shops)                                                as total_boutiques,
  (select count(*) from products where is_active = true)                     as produits_actifs,
  (select count(*) from products where stock_qty = 0 and is_active = true)   as ruptures_stock,
  (select count(*) from products where stock_qty <= 10 and stock_qty > 0 and is_active = true)
                                                                              as stock_faible,
  (select count(*) from suppliers where is_active = true)                    as fournisseurs_actifs,
  -- ca_today mélange produits et frais : on isole les deux.
  (select coalesce(sum(subtotal_fcfa),0)    from orders where created_at::date = current_date)
                                                                              as ca_produits_today,
  (select coalesce(sum(service_fee_fcfa),0) from orders where created_at::date = current_date)
                                                                              as frais_service_today;

alter view v_admin_dashboard set (security_invoker = on);

revoke all on v_admin_products      from anon;
revoke all on v_admin_orders_detail from anon;
revoke all on v_admin_dashboard     from anon;
