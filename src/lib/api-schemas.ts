import { z } from 'zod'

/** Algemene stringlimieten (DOS / DB-kolom-bescherming) */
export const shortText = z.string().trim().min(1).max(200)
export const mediumText = z.string().trim().max(2000)
export const longText = z.string().trim().max(8000)
export const emailField = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((s) => s.toLowerCase())

export const tenantSlugParam = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))

export const contactFormSchema = z.object({
  firstName: shortText.max(80),
  lastName: shortText.max(80),
  email: emailField,
  message: z.string().trim().min(1).max(5000),
})

export const loginBodySchema = z.object({
  email: emailField,
  password: z.string().min(1).max(256),
  target_tenant_slug: z
    .union([
      z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9-]*$/),
      z.null(),
      z.undefined(),
    ])
    .transform((s) => (typeof s === 'string' ? s : '')),
})

export const registerBodySchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  email: emailField,
  phone: z.string().trim().min(6).max(40),
  password: z.string().min(8).max(128),
})

export const forgotPasswordBodySchema = z.object({
  email: emailField,
})

export const resetPasswordBodySchema = z.object({
  token: z.string().trim().min(32).max(128),
  password: z.string().min(8).max(128),
})

export const resendVerificationBodySchema = z.object({
  email: emailField,
})

export const partnerApplicationSchema = z.object({
  company_name: shortText.max(200),
  contact_name: shortText.max(120),
  email: emailField,
  phone: z.string().trim().max(40).optional().nullable(),
  country: shortText.max(80),
  city: z.string().trim().max(120).optional().nullable(),
  website: optionalUrl,
  experience: mediumText.optional().nullable(),
  motivation: longText.optional().nullable(),
  expected_clients: z.string().trim().max(80).optional().nullable(),
})

const recipientSchema = z.object({
  email: emailField,
  name: z.string().trim().max(120).optional(),
})

export const marketingSendSchema = z.object({
  tenantSlug: tenantSlugParam,
  recipients: z.array(recipientSchema).min(1).max(500),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(100_000),
  includePromo: z.boolean().optional(),
  promoCode: z.string().trim().max(64).optional().nullable(),
  promoDiscount: z.coerce.number().min(0).max(100).optional().nullable(),
  businessName: z.string().trim().max(120).optional().nullable(),
})

export const trackViewBodySchema = z.object({
  page_path: z.string().trim().min(1).max(2048),
  referrer: z.string().trim().max(2048).optional().nullable(),
})
