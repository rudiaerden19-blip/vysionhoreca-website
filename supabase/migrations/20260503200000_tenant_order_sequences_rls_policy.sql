-- Advisor: RLS enabled zonder policies op tenant_order_sequences.
-- Alleen intern (trigger orders_assign_pos_order_number + service role); geen anon/authenticated client-access.

ALTER TABLE public.tenant_order_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_order_sequences_service_role_all ON public.tenant_order_sequences;

CREATE POLICY tenant_order_sequences_service_role_all
  ON public.tenant_order_sequences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
