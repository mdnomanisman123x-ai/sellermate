-- ============================================================
-- SellerMate database schema (Supabase / PostgreSQL)
-- Paste this whole file into Supabase -> SQL Editor -> Run.
-- Safe to run once on a NEW project. Every table has Row Level
-- Security: a user can only touch rows of workspaces they belong to.
-- ============================================================

-- ---------- Tables ----------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  business_type text not null default 'online_seller'
    check (business_type in ('online_seller','retail','wholesale','manufacturer','service','freelancer')),
  country text not null default 'BD' check (char_length(country) between 2 and 3),
  currency text not null default 'BDT' check (char_length(currency) = 3),
  business_size text not null default 'micro' check (business_size in ('micro','small','medium')),
  products_text text not null default '' check (char_length(products_text) <= 500),
  employee_count int not null default 0 check (employee_count between 0 and 100000),
  monthly_target numeric(14,2) not null default 0 check (monthly_target >= 0),
  opening_cash numeric(14,2) not null default 0,
  language text not null default 'bn' check (language in ('bn','en')),
  plan text not null default 'free' check (plan in ('free','starter','business','growth')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','staff','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null default '' check (char_length(phone) <= 30),
  address text not null default '' check (char_length(address) <= 300),
  note text not null default '' check (char_length(note) <= 1000),
  segment text not null default 'regular' check (segment in ('new','regular','vip','wholesale')),
  is_lead boolean not null default false,
  follow_up date,
  created_at timestamptz not null default now()
);
create index customers_ws_idx on public.customers(workspace_id);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null default '' check (char_length(phone) <= 30),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index suppliers_ws_idx on public.suppliers(workspace_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  sku text not null default '' check (char_length(sku) <= 60),
  unit text not null default 'pcs' check (char_length(unit) <= 20),
  kind text not null default 'product' check (kind in ('product','service')),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  sell_price numeric(14,2) not null default 0 check (sell_price >= 0),
  stock_qty numeric(14,2) not null default 0 check (stock_qty >= 0),
  reorder_level numeric(14,2) not null default 0 check (reorder_level >= 0),
  supplier_id uuid references public.suppliers(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_ws_idx on public.products(workspace_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled','returned')),
  order_date date not null default current_date,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  shipping_charge numeric(14,2) not null default 0 check (shipping_charge >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  note text not null default '' check (char_length(note) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (paid_amount <= total)
);
create index orders_ws_date_idx on public.orders(workspace_id, order_date);
create index orders_customer_idx on public.orders(customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_date date not null default current_date,
  product_id uuid references public.products(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  qty numeric(14,2) not null check (qty > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0)
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_ws_date_idx on public.order_items(workspace_id, order_date);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  category text not null check (char_length(category) between 1 and 40),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'paid' check (status in ('paid','due')),
  tx_date date not null default current_date,
  due_date date,
  paid_date date,
  note text not null default '' check (char_length(note) <= 300),
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  source text not null default 'manual' check (source in ('manual','system')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index transactions_ws_date_idx on public.transactions(workspace_id, tx_date);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty_change numeric(14,2) not null,
  reason text not null check (reason in ('purchase','sale','return','cancel','adjustment')),
  unit_cost numeric(14,2),
  order_id uuid references public.orders(id) on delete set null,
  note text not null default '' check (char_length(note) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_ws_idx on public.stock_movements(workspace_id, created_at desc);

create table public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  enabled boolean not null default false,
  share_financials boolean not null default false,
  share_sales boolean not null default false,
  share_inventory boolean not null default false,
  share_customer_stats boolean not null default false,
  share_customer_pii boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.ai_access_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  advisor_role text not null default '',
  scopes text[] not null default '{}',
  question_chars int not null default 0,
  context_chars int not null default 0,
  status text not null check (status in ('ok','blocked','error')),
  detail text not null default '' check (char_length(detail) <= 300),
  created_at timestamptz not null default now()
);
create index ai_access_log_ws_idx on public.ai_access_log(workspace_id, created_at desc);

-- No foreign key on workspace_id on purpose: audit rows must survive cascades.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index audit_logs_ws_idx on public.audit_logs(workspace_id, created_at desc);

-- ---------- Helper functions (used by security policies) ----------

create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.member_role(ws uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = auth.uid();
$$;

create or replace function public.has_role(ws uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.member_role(ws) = any(roles), false);
$$;

-- Plan limits (enforced here in the database, not in the browser).
create or replace function public.plan_limit(p_plan text, p_what text) returns int
language sql immutable as $$
  select case p_what
    when 'customers' then case p_plan when 'free' then 50 when 'starter' then 500 when 'business' then 5000 else 100000 end
    when 'products' then case p_plan when 'free' then 30 when 'starter' then 200 when 'business' then 2000 else 100000 end
    when 'orders_month' then case p_plan when 'free' then 100 when 'starter' then 1000 when 'business' then 10000 else 100000 end
    else 0
  end;
$$;

-- ---------- Triggers ----------

create or replace function public.check_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_count int := 0; v_what text := tg_argv[0];
begin
  select plan into v_plan from public.workspaces where id = new.workspace_id;
  if v_what = 'customers' then
    select count(*) into v_count from public.customers where workspace_id = new.workspace_id;
  elsif v_what = 'products' then
    select count(*) into v_count from public.products where workspace_id = new.workspace_id;
  end if;
  if v_count >= public.plan_limit(v_plan, v_what) then
    raise exception 'plan_limit_reached: %', v_what;
  end if;
  return new;
end; $$;

create trigger trg_limit_customers before insert on public.customers
  for each row execute function public.check_plan_limit('customers');
create trigger trg_limit_products before insert on public.products
  for each row execute function public.check_plan_limit('products');

-- Only the platform administrator (SQL editor / service role) may change the plan.
create or replace function public.protect_workspace() returns trigger
language plpgsql as $$
begin
  if new.plan is distinct from old.plan and auth.uid() is not null then
    raise exception 'plan can only be changed by the platform administrator';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable';
  end if;
  return new;
end; $$;
create trigger trg_protect_workspace before update on public.workspaces
  for each row execute function public.protect_workspace();

create or replace function public.tx_defaults() returns trigger
language plpgsql as $$
begin
  if new.status = 'paid' and new.paid_date is null then
    new.paid_date := new.tx_date;
  end if;
  return new;
end; $$;
create trigger trg_tx_defaults before insert on public.transactions
  for each row execute function public.tx_defaults();

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb; ws uuid; rid uuid;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  ws := coalesce((r->>'workspace_id')::uuid,
                 case when tg_table_name = 'workspaces' then (r->>'id')::uuid end);
  rid := (r->>'id')::uuid;
  insert into public.audit_logs(workspace_id, user_id, action, entity, entity_id)
  values (ws, auth.uid(), tg_op, tg_table_name, rid);
  return null;
end; $$;

create trigger trg_audit_workspaces after insert or update or delete on public.workspaces
  for each row execute function public.audit_row();
create trigger trg_audit_customers after insert or update or delete on public.customers
  for each row execute function public.audit_row();
create trigger trg_audit_suppliers after insert or update or delete on public.suppliers
  for each row execute function public.audit_row();
create trigger trg_audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row();
create trigger trg_audit_orders after insert or update or delete on public.orders
  for each row execute function public.audit_row();
create trigger trg_audit_transactions after insert or update or delete on public.transactions
  for each row execute function public.audit_row();
create trigger trg_audit_ai_settings after insert or update or delete on public.ai_settings
  for each row execute function public.audit_row();

-- ---------- Row Level Security ----------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.transactions enable row level security;
alter table public.stock_movements enable row level security;
alter table public.ai_settings enable row level security;
alter table public.ai_access_log enable row level security;
alter table public.audit_logs enable row level security;

-- workspaces (created only through create_workspace())
create policy ws_select on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy ws_update on public.workspaces for update to authenticated
  using (public.has_role(id, array['owner','admin']))
  with check (public.has_role(id, array['owner','admin']));
create policy ws_delete on public.workspaces for delete to authenticated
  using (public.has_role(id, array['owner']));

-- members (read only for now; invitations come in a later version)
create policy members_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.has_role(workspace_id, array['owner','admin']));

-- customers
create policy customers_select on public.customers for select to authenticated
  using (public.is_member(workspace_id));
create policy customers_insert on public.customers for insert to authenticated
  with check (public.has_role(workspace_id, array['owner','admin','manager','staff']));
create policy customers_update on public.customers for update to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager','staff']))
  with check (public.has_role(workspace_id, array['owner','admin','manager','staff']));
create policy customers_delete on public.customers for delete to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']));

-- suppliers
create policy suppliers_select on public.suppliers for select to authenticated
  using (public.is_member(workspace_id));
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (public.has_role(workspace_id, array['owner','admin','manager']));
create policy suppliers_update on public.suppliers for update to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']))
  with check (public.has_role(workspace_id, array['owner','admin','manager']));
create policy suppliers_delete on public.suppliers for delete to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']));

-- products (a product may only point at a supplier of the same workspace)
create policy products_select on public.products for select to authenticated
  using (public.is_member(workspace_id));
create policy products_insert on public.products for insert to authenticated
  with check (
    public.has_role(workspace_id, array['owner','admin','manager'])
    and (supplier_id is null or exists (
      select 1 from public.suppliers s where s.id = supplier_id and s.workspace_id = products.workspace_id))
  );
create policy products_update on public.products for update to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']))
  with check (
    public.has_role(workspace_id, array['owner','admin','manager'])
    and (supplier_id is null or exists (
      select 1 from public.suppliers s where s.id = supplier_id and s.workspace_id = products.workspace_id))
  );
create policy products_delete on public.products for delete to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']));

-- orders and items: read-only for users; all writes go through functions below
create policy orders_select on public.orders for select to authenticated
  using (public.is_member(workspace_id));
create policy order_items_select on public.order_items for select to authenticated
  using (public.is_member(workspace_id));
create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.is_member(workspace_id));

-- transactions (finance data: owner/admin/manager only)
create policy tx_select on public.transactions for select to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']));
create policy tx_insert on public.transactions for insert to authenticated
  with check (
    public.has_role(workspace_id, array['owner','admin','manager'])
    and source = 'manual'
    and category not in ('sales','purchase','refund')
    and (type = 'expense' or status = 'paid')
    and order_id is null
    and (customer_id is null or exists (
      select 1 from public.customers c where c.id = customer_id and c.workspace_id = transactions.workspace_id))
    and (supplier_id is null or exists (
      select 1 from public.suppliers s where s.id = supplier_id and s.workspace_id = transactions.workspace_id))
  );
create policy tx_delete on public.transactions for delete to authenticated
  using (public.has_role(workspace_id, array['owner','admin','manager']) and source = 'manual');

-- AI settings and logs
create policy ai_settings_select on public.ai_settings for select to authenticated
  using (public.is_member(workspace_id));
create policy ai_settings_update on public.ai_settings for update to authenticated
  using (public.has_role(workspace_id, array['owner']))
  with check (public.has_role(workspace_id, array['owner']));
create policy ai_log_select on public.ai_access_log for select to authenticated
  using (public.has_role(workspace_id, array['owner','admin']));
create policy ai_log_insert on public.ai_access_log for insert to authenticated
  with check (public.is_member(workspace_id) and user_id = auth.uid());

-- audit log: owner/admin can read, nobody can write directly
create policy audit_select on public.audit_logs for select to authenticated
  using (workspace_id is not null and public.has_role(workspace_id, array['owner','admin']));

-- ---------- Business functions (atomic, authorised, deterministic) ----------

create or replace function public.create_workspace(
  p_name text, p_business_type text, p_country text, p_currency text, p_size text,
  p_products text, p_employees int, p_target numeric, p_opening_cash numeric, p_language text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ws uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.workspace_members where user_id = v_uid) then
    raise exception 'workspace already exists';
  end if;
  insert into public.workspaces(name, business_type, country, currency, business_size,
      products_text, employee_count, monthly_target, opening_cash, language, created_by)
  values (trim(p_name), p_business_type, upper(p_country), upper(p_currency), p_size,
      coalesce(p_products,''), coalesce(p_employees,0), coalesce(p_target,0),
      coalesce(p_opening_cash,0), p_language, v_uid)
  returning id into v_ws;
  insert into public.workspace_members(workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  insert into public.ai_settings(workspace_id) values (v_ws);
  return v_ws;
end; $$;

create or replace function public.create_order(
  p_ws uuid, p_customer uuid, p_items jsonb, p_discount numeric, p_shipping numeric,
  p_paid numeric, p_status text, p_date date, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_item jsonb;
  v_prod public.products%rowtype;
  v_q numeric; v_price numeric; v_sub numeric := 0; v_tot numeric;
  v_plan text; v_cnt int;
  v_date date := coalesce(p_date, current_date);
  v_disc numeric := coalesce(p_discount, 0);
  v_ship numeric := coalesce(p_shipping, 0);
  v_paid numeric := coalesce(p_paid, 0);
begin
  if v_uid is null or not public.has_role(p_ws, array['owner','admin','manager','staff']) then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pending','confirmed','shipped','delivered') then raise exception 'invalid status'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no items';
  end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'too many items'; end if;
  if v_disc < 0 or v_ship < 0 or v_paid < 0 then raise exception 'invalid amount'; end if;
  if p_customer is not null and not exists
     (select 1 from public.customers where id = p_customer and workspace_id = p_ws) then
    raise exception 'invalid customer';
  end if;
  select plan into v_plan from public.workspaces where id = p_ws;
  select count(*) into v_cnt from public.orders
    where workspace_id = p_ws and order_date >= date_trunc('month', current_date)::date;
  if v_cnt >= public.plan_limit(v_plan, 'orders_month') then
    raise exception 'plan_limit_reached: orders';
  end if;

  insert into public.orders(workspace_id, customer_id, status, order_date, discount, shipping_charge, note, created_by)
  values (p_ws, p_customer, p_status, v_date, v_disc, v_ship, left(coalesce(p_note,''), 1000), v_uid)
  returning id into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_q := (v_item->>'qty')::numeric;
    v_price := (v_item->>'unit_price')::numeric;
    if v_q is null or v_q <= 0 or v_price is null or v_price < 0 then raise exception 'invalid item'; end if;
    if coalesce(v_item->>'product_id','') <> '' then
      select * into v_prod from public.products
        where id = (v_item->>'product_id')::uuid and workspace_id = p_ws and active for update;
      if not found then raise exception 'invalid product'; end if;
      if v_prod.kind = 'product' then
        if v_prod.stock_qty < v_q then raise exception 'insufficient stock: %', v_prod.name; end if;
        update public.products set stock_qty = stock_qty - v_q where id = v_prod.id;
        insert into public.stock_movements(workspace_id, product_id, qty_change, reason, unit_cost, order_id, created_by)
        values (p_ws, v_prod.id, -v_q, 'sale', v_prod.cost_price, v_order, v_uid);
      end if;
      insert into public.order_items(order_id, workspace_id, order_date, product_id, name, qty, unit_price, unit_cost)
      values (v_order, p_ws, v_date, v_prod.id, v_prod.name, v_q, v_price, v_prod.cost_price);
    else
      insert into public.order_items(order_id, workspace_id, order_date, product_id, name, qty, unit_price, unit_cost)
      values (v_order, p_ws, v_date, null, left(coalesce(nullif(v_item->>'name',''),'Item'),160), v_q, v_price,
              coalesce((v_item->>'unit_cost')::numeric, 0));
    end if;
    v_sub := v_sub + round(v_q * v_price, 2);
  end loop;

  v_tot := v_sub - v_disc + v_ship;
  if v_tot < 0 then raise exception 'discount exceeds subtotal'; end if;
  if v_paid > v_tot then raise exception 'paid amount exceeds total'; end if;
  update public.orders set subtotal = v_sub, total = v_tot, paid_amount = v_paid where id = v_order;
  if v_paid > 0 then
    insert into public.transactions(workspace_id, type, category, amount, status, tx_date, customer_id, order_id, source, created_by)
    values (p_ws, 'income', 'sales', v_paid, 'paid', v_date, p_customer, v_order, 'system', v_uid);
  end if;
  return v_order;
end; $$;

create or replace function public.set_order_status(p_order uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_it record; v_uid uuid := auth.uid();
begin
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'not found'; end if;
  if v_uid is null or not public.has_role(v_o.workspace_id, array['owner','admin','manager','staff']) then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pending','confirmed','shipped','delivered','cancelled','returned') then
    raise exception 'invalid status';
  end if;
  if v_o.status in ('cancelled','returned') then raise exception 'order is closed'; end if;
  if p_status in ('cancelled','returned') then
    for v_it in select * from public.order_items where order_id = v_o.id and product_id is not null loop
      if exists (select 1 from public.products where id = v_it.product_id and kind = 'product') then
        update public.products set stock_qty = stock_qty + v_it.qty where id = v_it.product_id;
        insert into public.stock_movements(workspace_id, product_id, qty_change, reason, unit_cost, order_id, created_by)
        values (v_o.workspace_id, v_it.product_id, v_it.qty,
                case when p_status = 'returned' then 'return' else 'cancel' end, v_it.unit_cost, v_o.id, v_uid);
      end if;
    end loop;
    if v_o.paid_amount > 0 then
      insert into public.transactions(workspace_id, type, category, amount, status, tx_date, customer_id, order_id, source, created_by)
      values (v_o.workspace_id, 'expense', 'refund', v_o.paid_amount, 'paid', current_date, v_o.customer_id, v_o.id, 'system', v_uid);
      update public.orders set paid_amount = 0 where id = v_o.id;
    end if;
  end if;
  update public.orders set status = p_status where id = v_o.id;
end; $$;

create or replace function public.add_order_payment(p_order uuid, p_amount numeric, p_date date) returns void
language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_uid uuid := auth.uid();
begin
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'not found'; end if;
  if v_uid is null or not public.has_role(v_o.workspace_id, array['owner','admin','manager']) then
    raise exception 'forbidden';
  end if;
  if v_o.status in ('cancelled','returned') then raise exception 'order is closed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  if v_o.paid_amount + p_amount > v_o.total then raise exception 'payment exceeds amount due'; end if;
  update public.orders set paid_amount = paid_amount + p_amount where id = v_o.id;
  insert into public.transactions(workspace_id, type, category, amount, status, tx_date, customer_id, order_id, source, created_by)
  values (v_o.workspace_id, 'income', 'sales', p_amount, 'paid', coalesce(p_date, current_date), v_o.customer_id, v_o.id, 'system', v_uid);
end; $$;

create or replace function public.purchase_stock(
  p_ws uuid, p_product uuid, p_qty numeric, p_unit_cost numeric, p_supplier uuid,
  p_paid boolean, p_date date, p_due_date date, p_note text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prod public.products%rowtype;
  v_new_cost numeric;
  v_date date := coalesce(p_date, current_date);
begin
  if v_uid is null or not public.has_role(p_ws, array['owner','admin','manager']) then
    raise exception 'forbidden';
  end if;
  if p_qty is null or p_qty <= 0 or p_unit_cost is null or p_unit_cost <= 0 then
    raise exception 'invalid quantity or cost';
  end if;
  select * into v_prod from public.products
    where id = p_product and workspace_id = p_ws and kind = 'product' for update;
  if not found then raise exception 'invalid product'; end if;
  if p_supplier is not null and not exists
     (select 1 from public.suppliers where id = p_supplier and workspace_id = p_ws) then
    raise exception 'invalid supplier';
  end if;
  if v_prod.stock_qty > 0 then
    v_new_cost := round(((v_prod.stock_qty * v_prod.cost_price) + (p_qty * p_unit_cost)) / (v_prod.stock_qty + p_qty), 2);
  else
    v_new_cost := round(p_unit_cost, 2);
  end if;
  update public.products set stock_qty = stock_qty + p_qty, cost_price = v_new_cost where id = v_prod.id;
  insert into public.stock_movements(workspace_id, product_id, qty_change, reason, unit_cost, note, created_by)
  values (p_ws, v_prod.id, p_qty, 'purchase', p_unit_cost, left(coalesce(p_note,''),300), v_uid);
  insert into public.transactions(workspace_id, type, category, amount, status, tx_date, due_date, note, supplier_id, source, created_by)
  values (p_ws, 'expense', 'purchase', round(p_qty * p_unit_cost, 2),
          case when p_paid then 'paid' else 'due' end, v_date,
          case when p_paid then null else p_due_date end,
          left(coalesce(p_note,''),300), p_supplier, 'system', v_uid);
end; $$;

create or replace function public.adjust_stock(p_product uuid, p_new_qty numeric, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_prod public.products%rowtype; v_uid uuid := auth.uid();
begin
  select * into v_prod from public.products where id = p_product and kind = 'product' for update;
  if not found then raise exception 'invalid product'; end if;
  if v_uid is null or not public.has_role(v_prod.workspace_id, array['owner','admin','manager']) then
    raise exception 'forbidden';
  end if;
  if p_new_qty is null or p_new_qty < 0 then raise exception 'invalid quantity'; end if;
  if p_new_qty = v_prod.stock_qty then return; end if;
  update public.products set stock_qty = p_new_qty where id = v_prod.id;
  insert into public.stock_movements(workspace_id, product_id, qty_change, reason, unit_cost, note, created_by)
  values (v_prod.workspace_id, v_prod.id, p_new_qty - v_prod.stock_qty, 'adjustment', v_prod.cost_price,
          left(coalesce(p_note,''),300), v_uid);
end; $$;

create or replace function public.pay_due(p_tx uuid, p_date date) returns void
language plpgsql security definer set search_path = public as $$
declare v_t public.transactions%rowtype; v_uid uuid := auth.uid();
begin
  select * into v_t from public.transactions where id = p_tx for update;
  if not found then raise exception 'not found'; end if;
  if v_uid is null or not public.has_role(v_t.workspace_id, array['owner','admin','manager']) then
    raise exception 'forbidden';
  end if;
  if v_t.type <> 'expense' or v_t.status <> 'due' then raise exception 'not a payable'; end if;
  update public.transactions set status = 'paid', paid_date = coalesce(p_date, current_date) where id = v_t.id;
end; $$;

-- ---------- Permissions ----------

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from public, anon;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.member_role(uuid) to authenticated;
grant execute on function public.has_role(uuid, text[]) to authenticated;
grant execute on function public.create_workspace(text,text,text,text,text,text,int,numeric,numeric,text) to authenticated;
grant execute on function public.create_order(uuid,uuid,jsonb,numeric,numeric,numeric,text,date,text) to authenticated;
grant execute on function public.set_order_status(uuid,text) to authenticated;
grant execute on function public.add_order_payment(uuid,numeric,date) to authenticated;
grant execute on function public.purchase_stock(uuid,uuid,numeric,numeric,uuid,boolean,date,date,text) to authenticated;
grant execute on function public.adjust_stock(uuid,numeric,text) to authenticated;
grant execute on function public.pay_due(uuid,date) to authenticated;
