/** @jest-environment node */

import {
  persistMenuProductOnServer,
  syncProductOptionLinksOnServer,
} from '@/lib/menu-product-server-persist'

describe('menu-product-server-persist', () => {
  it('syncProductOptionLinksOnServer skips write when ids unchanged', async () => {
    const productId = '11111111-1111-1111-1111-111111111111'
    const tenantSlug = 'demo-frituur'
    const optionA = '22222222-2222-2222-2222-222222222222'

    const supabase = {
      from: (table: string) => {
        if (table === 'menu_products') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: productId }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'product_option_links') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ option_id: optionA }],
                  error: null,
                }),
              }),
            }),
            delete: () => {
              throw new Error('delete should not run when unchanged')
            },
            insert: () => {
              throw new Error('insert should not run when unchanged')
            },
          }
        }
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }
      },
    } as unknown as Parameters<typeof syncProductOptionLinksOnServer>[0]

    const r = await syncProductOptionLinksOnServer(supabase, tenantSlug, productId, [optionA])
    expect(r.ok).toBe(true)
  })

  it('persistMenuProductOnServer returns normalized row on insert', async () => {
    const saved = {
      id: '33333333-3333-3333-3333-333333333333',
      tenant_slug: 'demo-frituur',
      name: 'Test',
      price: 5,
      kassa_image_zoom: 99,
    }
    const supabase = {
      from: () => ({
        insert: () => ({
          select: async () => ({ data: [saved], error: null }),
        }),
      }),
    } as unknown as Parameters<typeof persistMenuProductOnServer>[0]

    const { data, error } = await persistMenuProductOnServer(supabase, {
      tenant_slug: 'demo-frituur',
      category_id: null,
      name: 'Test',
      description: '',
      price: 5,
      image_url: '',
      is_active: true,
      is_popular: false,
      sort_order: 0,
      allergens: [],
    })
    expect(error).toBeUndefined()
    expect(data?.kassa_image_zoom).toBe(1.85)
  })
})
