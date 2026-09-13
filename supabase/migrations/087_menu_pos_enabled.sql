-- 087_menu_pos_enabled.sql
-- POS becomes a real, switchable feature.
--
-- Until now the POS tab rendered for any restaurant that had a menu, with no
-- way to turn it off. A restaurant doing delivery only still saw a waiter
-- terminal it will never open. Every other capability is a flag on menus;
-- POS was the exception, so it gets one too.
--
-- BACKFILL, and why it is `true`:
--   Today's behaviour is "menu exists → POS visible". Defaulting existing
--   rows to false would silently remove a tab that restaurants are using
--   right now. So existing menus keep POS, and only NEW menus start without
--   it. The default and the backfill deliberately disagree.

alter table menus add column if not exists pos_enabled boolean not null default false;

-- Preserve current behaviour for every restaurant that already exists.
update menus set pos_enabled = true where pos_enabled = false;

comment on column menus.pos_enabled is
  'Waiter POS terminal. Backfilled true in 087 to preserve pre-flag behaviour; new menus default false.';
