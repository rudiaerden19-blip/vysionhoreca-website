import {
  isTenantSettingsColumnPermissionError,
  stripTenantSettingsSecrets,
  TENANT_SETTINGS_PUBLIC_SELECT,
  TENANT_SETTINGS_SECRET_COLUMNS,
} from '@/lib/tenant-settings-secrets'

describe('tenant settings secrets', () => {
  it('strips payment and mail secrets and keeps the public stripe key', () => {
    const row = stripTenantSettingsSecrets({
      business_name: 'Friethuis',
      stripe_public_key: 'pk_test',
      stripe_secret_key: 'sk_live',
      stripe_webhook_secret: 'whsec',
      sumup_api_key: 'sup',
      mollie_api_key: 'live',
      smtp_password: 'pw',
      stripe_terminal_access_token: 'tok',
      kassa_name_account_v2: true,
    })
    expect(row.business_name).toBe('Friethuis')
    expect(row.stripe_public_key).toBe('pk_test')
    expect(row.kassa_name_account_v2).toBe(true)
    for (const key of TENANT_SETTINGS_SECRET_COLUMNS) {
      expect(row).not.toHaveProperty(key)
    }
  })

  it('public select list does not name a secret column', () => {
    const cols = TENANT_SETTINGS_PUBLIC_SELECT.split(',')
    for (const key of TENANT_SETTINGS_SECRET_COLUMNS) {
      expect(cols).not.toContain(key)
    }
    expect(cols).toContain('business_name')
    expect(cols).toContain('kassa_checkout_vat_mode')
    expect(cols).toContain('stripe_public_key')
  })

  it('recognises a column permission error', () => {
    expect(isTenantSettingsColumnPermissionError('permission denied for column stripe_secret_key')).toBe(true)
    expect(isTenantSettingsColumnPermissionError('42501')).toBe(true)
    expect(isTenantSettingsColumnPermissionError('column does not exist')).toBe(false)
  })
})
