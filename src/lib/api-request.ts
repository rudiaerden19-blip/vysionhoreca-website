import { NextRequest, NextResponse } from 'next/server'
import type { ZodSchema, ZodError } from 'zod'

export function jsonValidationError(error: ZodError): NextResponse {
  const flat = error.flatten()
  const first =
    Object.values(flat.fieldErrors).flat()[0] ||
    flat.formErrors[0] ||
    'Ongeldige invoer'
  return NextResponse.json({ error: first }, { status: 400 })
}

/**
 * Parse JSON body en valideer met Zod. Bij parse/validatiefout: 400 JSON (geen throw naar buiten).
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Ongeldige of lege JSON' }, { status: 400 }),
    }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, response: jsonValidationError(parsed.error) }
  }
  return { ok: true, data: parsed.data }
}

export function jsonServerError(message = 'Er is een fout opgetreden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 })
}
