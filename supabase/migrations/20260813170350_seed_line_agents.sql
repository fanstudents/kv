-- The schema-only baseline cannot carry the rows that make agent deployment
-- state writable. Seed every canonical legacy slug without overwriting settings
-- or enabled flags in environments that already have real configuration.
insert into public.line_agents (slug, name, enabled)
values
  ('teamlead', '總管 Agent', true),
  ('notify', '通知 Agent', true),
  ('report', '數據 Agent', true),
  ('schedule', '行程 Agent', true),
  ('card', '社群 Agent', true),
  ('expense', 'SEO Agent', true),
  ('visit', '約拜訪 Agent', true),
  ('today', '廣告 Agent', true),
  ('competitor', '口碑 Agent', true),
  ('operations', '營運 Agent', true),
  ('support', '客服 Agent', false),
  ('orders', '訂單 Agent', false)
on conflict (slug) do nothing;
