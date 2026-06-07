/**
 * GKS-pilot: toets-dome (keyboard-ref) — zachte radiale schakering, licht bollig.
 */

/** Chiclet-toets: nauwelijks afgerond. */
export const GKS_BTN_SHAPE = 'rounded-[4px]'

/** Convex dome: highlight top-midden, donker aan randen (zoals toetsenbord). */
const GKS_KEY_FACE =
  'bg-[radial-gradient(ellipse_95%_75%_at_50%_32%,#8f8f8f_0%,#5a5a5a_28%,#2a2a2a_58%,#121212_82%,#060606_100%)]'

const GKS_KEY_FACE_SELECTED =
  'bg-[radial-gradient(ellipse_95%_75%_at_50%_32%,#a5a5a5_0%,#6d6d6d_28%,#3a3a3a_58%,#1a1a1a_82%,#0a0a0a_100%)]'

const GKS_KEY_DEPTH =
  'border border-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.04)]'

/** Standaard toets (numpad, sidebar, header). */
export const GKS_POS_BTN = [
  GKS_KEY_FACE,
  GKS_KEY_DEPTH,
  'text-[#e8e8e8]',
  'hover:brightness-[1.06]',
  'active:brightness-[0.94]',
].join(' ')

/** Geselecteerde toets. */
export const GKS_POS_BTN_SELECTED = [
  GKS_KEY_FACE_SELECTED,
  GKS_KEY_DEPTH,
  'text-white',
  'ring-1 ring-inset ring-white/10',
  'hover:brightness-[1.06]',
  'active:brightness-[0.94]',
].join(' ')

/** Primaire actie (Afrekenen, actieve categorie). */
export const GKS_ACCENT_BTN = [
  GKS_BTN_SHAPE,
  'bg-[radial-gradient(ellipse_95%_75%_at_50%_30%,#6eb8ff_0%,#1a6fe8_35%,#0048b5_68%,#002a6b_100%)]',
  'text-white',
  'border border-[#001a45]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.5)]',
  'hover:brightness-[1.05]',
  'active:brightness-[0.93]',
].join(' ')

/** Ingevallen display (totaal, numpad-invoer). */
export const GKS_POS_FIELD = [
  GKS_BTN_SHAPE,
  'bg-[radial-gradient(ellipse_110%_90%_at_50%_18%,#4a4a4a_0%,#252525_45%,#0c0c0c_100%)]',
  'border border-[#030303]',
  'shadow-[inset_0_3px_10px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]',
].join(' ')

/** Onderstrook menu-tegel. */
export const GKS_MENU_TILE_LABEL_SURFACE =
  'bg-[radial-gradient(ellipse_100%_80%_at_50%_28%,#7a7a7a_0%,#454545_50%,#1e1e1e_100%)]'

export function gksPosButtonClass(selected: boolean): string {
  return `${GKS_BTN_SHAPE} ${selected ? GKS_POS_BTN_SELECTED : GKS_POS_BTN}`
}
