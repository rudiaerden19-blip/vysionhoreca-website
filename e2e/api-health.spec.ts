import { expect, test } from '@playwright/test'

test.describe('API health', () => {
  test('GET /api/health responds', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('status')
    expect(json).toHaveProperty('services')
  })
})
