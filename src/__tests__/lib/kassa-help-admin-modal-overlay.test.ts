import { kassaHelpAdminModalOverlayClass } from '@/lib/kassa-help-admin-modal-overlay'

describe('kassaHelpAdminModalOverlayClass', () => {
  it('uses full viewport when help is closed', () => {
    expect(kassaHelpAdminModalOverlayClass(false)).toContain('inset-0')
    expect(kassaHelpAdminModalOverlayClass(false)).not.toContain('w-1/2')
  })

  it('limits overlay to left half when help is open', () => {
    expect(kassaHelpAdminModalOverlayClass(true)).toContain('w-1/2')
    expect(kassaHelpAdminModalOverlayClass(true)).toContain('left-0')
    expect(kassaHelpAdminModalOverlayClass(true)).not.toContain('inset-0')
  })
})
