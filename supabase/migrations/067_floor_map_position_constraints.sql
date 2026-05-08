-- 067_floor_map_position_constraints.sql
-- Floor map V1 stores tile positions in restaurant_tables.pos_x / pos_y
-- as percent of the area's canvas (0-100). The columns existed dormant
-- from migration 045; this migration formalises the percent convention
-- via two CHECK constraints so a buggy client can't slip a 150% in.
--
-- Idempotent: each constraint is added only if not already present.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurant_tables_pos_x_pct_check'
  ) then
    alter table restaurant_tables
      add constraint restaurant_tables_pos_x_pct_check
      check (pos_x is null or (pos_x >= 0 and pos_x <= 100));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'restaurant_tables_pos_y_pct_check'
  ) then
    alter table restaurant_tables
      add constraint restaurant_tables_pos_y_pct_check
      check (pos_y is null or (pos_y >= 0 and pos_y <= 100));
  end if;
end$$;
