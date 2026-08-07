-- Reserveringsrapporten (admin kassa) — voorbeeldqueries per tenant
-- Data staat in public.reservations; index: idx_reservations_tenant_date (tenant_slug, reservation_date)

-- Dag (vervang :tenant_slug en :day)
-- SELECT reservation_date, reservation_time, guest_name, guest_phone, guest_email,
--        party_size, table_number, status, notes, special_requests
-- FROM reservations
-- WHERE tenant_slug = :tenant_slug
--   AND reservation_date = :day
-- ORDER BY reservation_time;

-- Week (ma–zo rond :anchor_date)
-- SELECT * FROM reservations
-- WHERE tenant_slug = :tenant_slug
--   AND reservation_date >= date_trunc('week', :anchor_date::date)::date
--   AND reservation_date < (date_trunc('week', :anchor_date::date) + interval '7 days')::date;

-- Maand
-- SELECT * FROM reservations
-- WHERE tenant_slug = :tenant_slug
--   AND reservation_date >= date_trunc('month', :month_start::date)::date
--   AND reservation_date < (date_trunc('month', :month_start::date) + interval '1 month')::date;

-- Jaar
-- SELECT * FROM reservations
-- WHERE tenant_slug = :tenant_slug
--   AND reservation_date >= make_date(:year, 1, 1)
--   AND reservation_date <= make_date(:year, 12, 31);
