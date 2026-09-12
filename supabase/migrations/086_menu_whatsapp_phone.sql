-- 086_menu_whatsapp_phone.sql
-- A per-restaurant WhatsApp number for receiving orders.
--
-- Orders are handed to the kitchen by opening WhatsApp with the order
-- pre-written, so every menu needs a number that reaches THAT kitchen.
--
-- host_profiles.phone is not a substitute: it is the account holder's personal
-- number and is shared across every listing they own. Today 5 of 10 published
-- menus resolve to the same +34 number and the other 5 resolve to nothing,
-- so without this column an order would either go nowhere or go to the wrong
-- person.
--
-- Nullable on purpose. A menu without a number simply cannot offer WhatsApp
-- ordering, and the UI says so rather than opening a broken link.

alter table menus
  add column if not exists whatsapp_phone text;

comment on column menus.whatsapp_phone is
  'E.164 number that receives new orders over WhatsApp, e.g. +254712345678. Falls back to host_profiles.phone when null.';
