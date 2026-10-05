/** Admin-modals: bij open help-video alleen over de POS-kolom (linker helft), niet onder het paneel. */
const OVERLAY_BASE =
  'fixed z-[140] flex items-center justify-center bg-black/60 p-4 vysion-admin-modal-overlay'

export function kassaHelpAdminModalOverlayClass(helpOpen: boolean): string {
  return helpOpen
    ? `${OVERLAY_BASE} inset-y-0 left-0 w-1/2 max-w-[50vw]`
    : `${OVERLAY_BASE} inset-0`
}
