export type GksActiveStaff = {
  id: string
  name: string
  insz: string
}

export function normalizeInsz(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return null
  return digits
}

export function assertGksStaffForFiscal(staff: GksActiveStaff | null | undefined): staff is GksActiveStaff {
  return Boolean(staff?.id && staff?.name && normalizeInsz(staff.insz))
}
