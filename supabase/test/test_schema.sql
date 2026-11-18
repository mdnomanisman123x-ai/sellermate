-- Automated checks for schema.sql (run after stub_supabase.sql and schema.sql).
-- Any failed check raises an exception and stops the run.
\set ON_ERROR_STOP on
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'
\set C '33333333-3333-3333-3333-333333333333'

create or replace function pg_temp.expect(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', msg; end if; raise notice 'PASS: %', msg; end; $$;
-- run a statement and require that it fails
create or replace function pg_temp.fails(stmt text, msg text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then raise notice 'PASS: % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (should have been blocked): %', msg;
end; $$;

insert into auth.users(id, email) values (:'A','a@x.com'), (:'B','b@x.com'), (:'C','c@x.com');
grant execute on function pg_temp.expect(boolean,text), pg_temp.fails(text,text) to public;

-- ===== A and B each create a workspace =====
set role authenticated; set request.jwt.claim.sub = :'A';
select public.create_workspace('A Shop','retail','BD','BDT','small','shoes',1,100000,5000,'bn') as wsa \gset
set request.jwt.claim.sub = :'B';
select public.create_workspace('B Shop','online_seller','BD','BDT','micro','bags',0,0,0,'en') as wsb \gset
select pg_temp.fails($$select public.create_workspace('Again','retail','BD','BDT','small','',0,0,0,'bn')$$, 'second workspace for same user is refused');

-- ===== Tenant isolation =====
set request.jwt.claim.sub = :'A';
select pg_temp.expect((select count(*) from public.workspaces) = 1, 'A sees only own workspace');
insert into public.customers(workspace_id, name, phone) values (:'wsa','Rina','01711111111');
insert into public.customers(workspace_id, name) values (:'wsa','Karim');
select pg_temp.expect((select count(*) from public.customers) = 2, 'A sees own 2 customers');
set request.jwt.claim.sub = :'B';
select pg_temp.expect((select count(*) from public.customers) = 0, 'B sees none of As customers');
select pg_temp.fails(format($$insert into public.customers(workspace_id,name) values (%L,'Evil')$$, :'wsa'), 'B cannot insert into As workspace');
select pg_temp.expect((select count(*) from (select 1 from public.customers where workspace_id = :'wsa' for update) x) = 0, 'B cannot lock As rows');
update public.customers set name = 'Hacked' where workspace_id = :'wsa';
delete from public.customers where workspace_id = :'wsa';
set request.jwt.claim.sub = :'A';
select pg_temp.expect((select count(*) from public.customers where name = 'Rina') = 1, 'B update/delete of As rows had no effect');

-- ===== Plan protection =====
select pg_temp.fails(format($$update public.workspaces set plan = 'growth' where id = %L$$, :'wsa'), 'owner cannot upgrade own plan');
update public.workspaces set monthly_target = 120000 where id = :'wsa';
select pg_temp.expect((select monthly_target from public.workspaces) = 120000, 'owner can edit normal settings');

-- ===== Inventory: purchase, moving-average cost =====
insert into public.products(workspace_id,name,cost_price,sell_price,reorder_level) values (:'wsa','Sneaker',0,300,5);
insert into public.products(workspace_id,name,kind,sell_price) values (:'wsa','Delivery','service',60);
select id as p1 from public.products where name = 'Sneaker' \gset
select id as psv from public.products where name = 'Delivery' \gset
select public.purchase_stock(:'wsa', :'p1', 10, 100, null, true, current_date, null, 'first');
select public.purchase_stock(:'wsa', :'p1', 10, 200, null, false, current_date, current_date + 7, 'second');
select pg_temp.expect((select stock_qty from public.products where id = :'p1') = 20, 'stock is 20 after two purchases');
select pg_temp.expect((select cost_price from public.products where id = :'p1') = 150.00, 'moving average cost is 150');
select pg_temp.expect((select sum(amount) from public.transactions where status = 'due') = 2000, 'unpaid purchase is a payable of 2000');
select pg_temp.fails(format($$select public.purchase_stock(%L,%L,0,100,null,true,null,null,'')$$, :'wsa', :'p1'), 'zero quantity purchase refused');
select pg_temp.fails(format($$select public.purchase_stock(%L,%L,1,100,null,true,null,null,'')$$, :'wsa', :'psv'), 'cannot purchase stock of a service');

-- ===== Orders: server-side total, stock, payment =====
select public.create_order(:'wsa', (select id from public.customers where name='Rina'),
  jsonb_build_array(jsonb_build_object('product_id', :'p1', 'qty', 5, 'unit_price', 300),
                    jsonb_build_object('product_id', :'psv', 'qty', 1, 'unit_price', 60)),
  50, 0, 500, 'confirmed', current_date, 'test') as o1 \gset
select pg_temp.expect((select total from public.orders where id = :'o1') = 1510, 'total = 1500 + 60 - 50 = 1510');
select pg_temp.expect((select stock_qty from public.products where id = :'p1') = 15, 'stock reduced to 15');
select pg_temp.expect((select amount from public.transactions where order_id = :'o1' and category = 'sales') = 500, 'advance payment recorded as income');
select pg_temp.expect((select unit_cost from public.order_items where order_id = :'o1' and name = 'Sneaker') = 150, 'item cost snapshot is 150');
select pg_temp.fails(format($$select public.create_order(%L,null,'[{"product_id":"%s","qty":100,"unit_price":300}]'::jsonb,0,0,0,'pending',null,'')$$, :'wsa', :'p1'), 'insufficient stock refused');
select pg_temp.expect((select count(*) from public.orders) = 1, 'failed order left no partial data');
select pg_temp.expect((select stock_qty from public.products where id = :'p1') = 15, 'failed order did not touch stock');
select pg_temp.fails(format($$select public.create_order(%L,null,'[{"name":"x","qty":1,"unit_price":100}]'::jsonb,0,0,500,'pending',null,'')$$, :'wsa'), 'paid more than total refused');
select pg_temp.fails(format($$select public.create_order(%L,null,'[]'::jsonb,0,0,0,'pending',null,'')$$, :'wsa'), 'empty order refused');
select public.add_order_payment(:'o1', 1010, current_date);
select pg_temp.expect((select paid_amount from public.orders where id = :'o1') = 1510, 'fully paid');
select pg_temp.fails(format($$select public.add_order_payment(%L, 1, null)$$, :'o1'), 'overpayment refused');

-- ===== Cancel: restock + refund =====
select public.set_order_status(:'o1', 'cancelled');
select pg_temp.expect((select stock_qty from public.products where id = :'p1') = 20, 'cancel restocks to 20');
select pg_temp.expect((select amount from public.transactions where order_id = :'o1' and category = 'refund') = 1510, 'refund of 1510 recorded');
select pg_temp.expect((select paid_amount from public.orders where id = :'o1') = 0, 'paid amount reset');
select pg_temp.fails(format($$select public.set_order_status(%L,'delivered')$$, :'o1'), 'closed order cannot be reopened');

-- ===== Cross-tenant function abuse =====
select public.create_order(:'wsa', null, '[{"name":"Service","qty":1,"unit_price":1000}]'::jsonb, 0, 0, 0, 'pending', null, '') as o2 \gset
set request.jwt.claim.sub = :'B';
select pg_temp.fails(format($$select public.create_order(%L,null,'[{"name":"x","qty":1,"unit_price":1}]'::jsonb,0,0,0,'pending',null,'')$$, :'wsa'), 'B cannot create order in As workspace');
select pg_temp.fails(format($$select public.set_order_status(%L,'cancelled')$$, :'o2'), 'B cannot change As order');
select pg_temp.fails(format($$select public.add_order_payment(%L,10,null)$$, :'o2'), 'B cannot take payment on As order');
select pg_temp.fails(format($$select public.purchase_stock(%L,%L,1,1,null,true,null,null,'')$$, :'wsa', :'p1'), 'B cannot purchase into As stock');
select pg_temp.fails(format($$select public.adjust_stock(%L, 999, '')$$, :'p1'), 'B cannot adjust As stock');
select pg_temp.expect((select count(*) from public.orders) = 0, 'B sees no orders');
select pg_temp.expect((select count(*) from public.order_items) = 0, 'B sees no order items');
select pg_temp.expect((select count(*) from public.transactions) = 0, 'B sees no transactions');
select pg_temp.expect((select count(*) from public.ai_settings where workspace_id = :'wsa') = 0, 'B cannot see As AI settings');
select pg_temp.expect((select count(*) from public.audit_logs where workspace_id = :'wsa') = 0, 'B sees none of As audit logs');

-- ===== Manual finance entries =====
set request.jwt.claim.sub = :'A';
insert into public.transactions(workspace_id,type,category,amount,note) values (:'wsa','expense','rent',3000,'shop rent');
select pg_temp.fails(format($$insert into public.transactions(workspace_id,type,category,amount) values (%L,'income','sales',99)$$, :'wsa'), 'manual fake sales income refused');
select pg_temp.fails(format($$insert into public.transactions(workspace_id,type,category,amount,source) values (%L,'expense','rent',9,'system')$$, :'wsa'), 'manual entry cannot claim to be system');
select pg_temp.fails(format($$insert into public.transactions(workspace_id,type,category,amount,status) values (%L,'income','other_income',9,'due')$$, :'wsa'), 'income cannot be left as due');
delete from public.transactions where category = 'purchase';
select pg_temp.expect((select count(*) from public.transactions where category = 'purchase') = 2, 'system transactions cannot be deleted');
delete from public.transactions where category = 'rent';
select pg_temp.expect((select count(*) from public.transactions where category = 'rent') = 0, 'manual transaction can be deleted');
select id as due1 from public.transactions where status = 'due' limit 1 \gset
select public.pay_due(:'due1', current_date);
select pg_temp.expect((select count(*) from public.transactions where status = 'due') = 0, 'payable marked paid');

-- ===== Roles: staff member C =====
reset role;
insert into public.workspace_members(workspace_id, user_id, role) values (:'wsa', :'C', 'staff');
set role authenticated; set request.jwt.claim.sub = :'C';
select pg_temp.expect((select count(*) from public.customers) = 2, 'staff can read customers');
select pg_temp.expect((select count(*) from public.transactions) = 0, 'staff cannot read finance transactions');
select pg_temp.fails(format($$insert into public.transactions(workspace_id,type,category,amount) values (%L,'expense','rent',1)$$, :'wsa'), 'staff cannot add finance entries');
select pg_temp.fails(format($$select public.purchase_stock(%L,%L,1,1,null,true,null,null,'')$$, :'wsa', :'p1'), 'staff cannot purchase stock');
select pg_temp.fails(format($$select public.add_order_payment(%L,10,null)$$, :'o2'), 'staff cannot record payments');
update public.workspaces set name = 'x' where id = :'wsa';
select pg_temp.expect((select name from public.workspaces where id = :'wsa') = 'A Shop', 'staff cannot rename workspace');
select pg_temp.fails(format($$insert into public.products(workspace_id,name) values (%L,'x')$$, :'wsa'), 'staff cannot add products');
select public.create_order(:'wsa', null, '[{"name":"Walk-in","qty":1,"unit_price":50}]'::jsonb, 0, 0, 0, 'pending', null, 'by staff');
select pg_temp.expect((select count(*) from public.orders) = 3, 'staff can create orders');
select pg_temp.expect((select count(*) from public.audit_logs) = 0, 'staff cannot read audit logs');
select pg_temp.expect((select count(*) from public.workspace_members) = 1, 'staff sees only own membership');
update public.ai_settings set enabled = true where workspace_id = :'wsa';
select pg_temp.expect((select enabled from public.ai_settings where workspace_id = :'wsa') = false, 'staff cannot enable AI');

-- ===== AI settings, logs, audit =====
set request.jwt.claim.sub = :'A';
update public.ai_settings set enabled = true, share_financials = true where workspace_id = :'wsa';
select pg_temp.expect((select enabled from public.ai_settings) , 'owner can change AI settings');
insert into public.ai_access_log(workspace_id, user_id, advisor_role, scopes, status) values (:'wsa', :'A', 'cfo', '{financials}', 'ok');
select pg_temp.fails(format($$insert into public.ai_access_log(workspace_id,user_id,status) values (%L,%L,'ok')$$, :'wsa', :'B'), 'cannot forge a log entry as another user');
select pg_temp.expect((select count(*) from public.ai_access_log) = 1, 'owner reads AI access log');
select pg_temp.expect((select count(*) from public.audit_logs) > 5, 'audit log has entries');
select pg_temp.fails(format($$insert into public.audit_logs(workspace_id,action,entity) values (%L,'x','y')$$, :'wsa'), 'users cannot write audit log');
update public.audit_logs set action = 'tampered';
select pg_temp.expect((select count(*) from public.audit_logs where action = 'tampered') = 0, 'users cannot tamper audit log');
delete from public.audit_logs;
select pg_temp.expect((select count(*) from public.audit_logs) > 5, 'users cannot delete audit log');

-- ===== Plan limit: free plan = 50 customers =====
select count(*) as have from public.customers \gset
insert into public.customers(workspace_id, name) select :'wsa', 'bulk ' || g from generate_series(1, 50 - :have) g;
select pg_temp.expect((select count(*) from public.customers) = 50, 'reached free limit of 50 customers');
select pg_temp.fails(format($$insert into public.customers(workspace_id,name) values (%L,'one too many')$$, :'wsa'), 'free plan stops at 50 customers');
reset role; set request.jwt.claim.sub = '';
update public.workspaces set plan = 'starter' where id = :'wsa';
set role authenticated; set request.jwt.claim.sub = :'A';
insert into public.customers(workspace_id, name) values (:'wsa','allowed after upgrade');
select pg_temp.expect((select count(*) from public.customers) = 51, 'admin upgrade lifts the limit');

-- ===== anon has no access =====
reset role; set role anon;
select pg_temp.fails($$select count(*) from public.customers$$, 'anonymous users cannot read data');
select pg_temp.fails($$select public.create_workspace('x','retail','BD','BDT','small','',0,0,0,'bn')$$, 'anonymous users cannot call functions');

-- ===== Delete workspace cascades; audit rows survive =====
reset role; set role authenticated; set request.jwt.claim.sub = :'A';
delete from public.workspaces where id = :'wsa';
reset role;
select pg_temp.expect((select count(*) from public.customers where workspace_id = :'wsa') = 0, 'cascade removed customers');
select pg_temp.expect((select count(*) from public.orders where workspace_id = :'wsa') = 0, 'cascade removed orders');
select pg_temp.expect((select count(*) from public.audit_logs where workspace_id = :'wsa') > 0, 'audit rows survive for later cleanup');

\echo ALL CHECKS PASSED
