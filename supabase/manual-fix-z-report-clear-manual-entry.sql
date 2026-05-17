-- One-off corrective UPDATE when “Kassa invoer” duplicated order turnover:
-- archived sidebar shows total = z_reports.total + z_reports.manual_total.
--
-- report_hash only covers orders/total/order_ids (see Z-rapport UI); clearing manual_* does not invalidate the seal hash.
--
-- 1. Replace YOUR_TENANT_SLUG with the shop slug from the URL (/shop/[tenant]/admin/...).
-- 2. Set report_date to the fiscal day (YYYY-MM-DD).
-- 3. Run in Supabase SQL (verify row count = 1 before COMMIT if your workflow uses transactions).

UPDATE z_reports
SET
  manual_cash = NULL,
  manual_card = NULL,
  manual_online = NULL,
  manual_total = NULL,
  kassa_saved_at = NULL
WHERE tenant_slug = 'YOUR_TENANT_SLUG'
  AND report_date = '2026-05-17';
