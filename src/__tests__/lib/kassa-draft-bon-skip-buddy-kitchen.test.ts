import { shouldSkipBuddyKitchenOnKassaDraftBon } from '@/lib/kassa-draft-bon-skip-buddy-kitchen'

describe('shouldSkipBuddyKitchenOnKassaDraftBon', () => {
  it('default uit voor ontbrekende settings', () => {
    expect(shouldSkipBuddyKitchenOnKassaDraftBon(null)).toBe(false)
    expect(shouldSkipBuddyKitchenOnKassaDraftBon({})).toBe(false)
    expect(shouldSkipBuddyKitchenOnKassaDraftBon({ kassa_draft_bon_skip_buddy_kitchen: false })).toBe(
      false,
    )
  })

  it('aan alleen bij expliciet true', () => {
    expect(shouldSkipBuddyKitchenOnKassaDraftBon({ kassa_draft_bon_skip_buddy_kitchen: true })).toBe(
      true,
    )
  })
})
