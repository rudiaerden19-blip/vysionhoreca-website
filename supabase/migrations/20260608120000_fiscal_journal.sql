-- fiscal_journal: Checkbox FDM sign* journal (GKS)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fiscal_status') THEN
    CREATE TYPE public.fiscal_status AS ENUM (
      'PENDING',
      'SENT',
      'SUCCESS',
      'FAILED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fiscal_event_label') THEN
    CREATE TYPE public.fiscal_event_label AS ENUM (
      'N',
      'P',
      'T',
      'C',
      'F',
      'S',
      'I',
      'R'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.fiscal_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_slug TEXT NOT NULL,

  status public.fiscal_status NOT NULL DEFAULT 'PENDING',
  event_label public.fiscal_event_label NOT NULL,

  pos_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  pos_fiscal_ticket_no INTEGER NOT NULL,
  pos_date_time TIMESTAMPTZ NOT NULL,

  idempotency_key UUID NOT NULL,

  mutation TEXT NOT NULL,

  booking_period_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  employee_id CHAR(11) NOT NULL,

  request_payload JSONB NOT NULL,
  response_payload JSONB,
  error_payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_journal_fdm_success_keys
  ON public.fiscal_journal (
    tenant_slug,
    pos_id,
    terminal_id,
    event_label,
    pos_fiscal_ticket_no,
    pos_date_time
  )
  WHERE status = 'SUCCESS';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_journal_idempotency
  ON public.fiscal_journal (tenant_slug, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_fiscal_journal_tenant_created
  ON public.fiscal_journal (tenant_slug, created_at DESC);

ALTER TABLE public.fiscal_journal ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_success_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'SUCCESS'::public.fiscal_status THEN
    RAISE EXCEPTION 'fiscal_journal: rijen met status SUCCESS mogen niet gewijzigd worden';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fiscal_journal_prevent_success_update ON public.fiscal_journal;
CREATE TRIGGER trg_fiscal_journal_prevent_success_update
  BEFORE UPDATE ON public.fiscal_journal
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_success_update();

DROP TRIGGER IF EXISTS trg_fiscal_journal_updated_at ON public.fiscal_journal;
CREATE TRIGGER trg_fiscal_journal_updated_at
  BEFORE UPDATE ON public.fiscal_journal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.fiscal_journal IS
  'Append-only GKS/Checkbox FDM journal (GraphQL sign* request/response).';
