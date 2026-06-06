-- GKS: INSZ (employeeId) op staff — verplicht voor fysieke GKS-kassa.

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS insz TEXT;

COMMENT ON COLUMN public.staff.insz IS
  'INSZ (11 cijfers) voor GKS GraphQL employeeId; verplicht voor medewerkers op /admin/gks-kassa.';
