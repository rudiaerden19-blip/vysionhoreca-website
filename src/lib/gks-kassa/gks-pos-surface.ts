/**
 * GKS-pilot: POS-ref — zwart-grijs, lichte verticale overgang, subtiele schaduw (niet overdreven).
 */

/** Eén vlak: effen #333336 + subtiele CSS-korrel (globals `.gks-menu-plate-grain`). */
export const GKS_MENU_PLATE_BG = '#333336'
export const GKS_MENU_PLATE_SHELL_BG_CLASS = 'gks-menu-plate-grain'

/** Secties zonder eigen kleur — zelfde effen grijs als shell. */
export const GKS_MENU_PLATE_TRANSPARENT_CLASS = 'bg-transparent'

/** @deprecated Gebruik SHELL op wrapper; TRANSPARENT alleen waar shell doorloopt. */
export const GKS_MENU_PLATE_BG_CLASS = GKS_MENU_PLATE_SHELL_BG_CLASS

/** Dunne zwarte scheidingslijnen (header-nav, sidebar, footer). */
export const GKS_RULE_BLACK = 'border-black'

/** Afgerond — sidebar-knoppen, tegels, klokbalk (geen pill). */
export const GKS_BTN_SHAPE = 'rounded-xl'

/** Minder zwaar dan overal `font-bold`. */
export const GKS_FONT_UI = 'font-semibold'
export const GKS_FONT_UI_SOFT = 'font-medium'

/** Klokbalk: sterkere zwarte lift (legacy export). */
export const GKS_CLOCK_BAR_SHADOW =
  'shadow-[0_6px_12px_rgba(0,0,0,0.62),0_14px_30px_rgba(0,0,0,0.5),0_20px_44px_rgba(0,0,0,0.38)]'

export const GKS_CLOCK_BAR_LIFT_SHADOW = GKS_CLOCK_BAR_SHADOW

/** Zachte “bollig”: donker boven/onder, iets lichter midden — geen harde radiale flare. */
const GKS_BTN_FACE =
  'bg-[linear-gradient(180deg,#161616_0%,#323232_46%,#1c1c1c_100%)]'

/** Diepte achter knoppen — verticaal ongewijzigd; +20% zij-lift (±x, geen extra y). */
export const GKS_SUBTLE_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.61),0_11px_24px_rgba(0,0,0,0.46),-6px_0_14px_rgba(0,0,0,0.38),6px_0_14px_rgba(0,0,0,0.38)]'

/** Diepte achter menu-tegels — iets ruimer zwart. */
export const GKS_TILE_LIFT_SHADOW =
  'shadow-[0_5px_10px_rgba(0,0,0,0.56),0_12px_28px_rgba(0,0,0,0.42),0_16px_38px_rgba(0,0,0,0.34)]'

/** Geselecteerd — zwarte lift + blauwe gloed (Ter plaatse, Num pad, Menu, …). */
export const GKS_POS_SELECTED_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_15px_37px_rgba(0,0,0,0.40),-7px_0_16px_rgba(0,0,0,0.40),7px_0_16px_rgba(0,0,0,0.40),0_6px_24px_rgba(26,127,216,0.44),0_0_22px_rgba(110,181,255,0.30),0_0_12px_rgba(110,181,255,0.34)]'

/** Geselecteerde POS-knoppen + Afrekenen (constant). */
export const GKS_POS_SELECTED_ACCENT_TEXT = 'text-[#6eb5ff]'

const GKS_BTN_EDGE = `border border-[#2a2a2a] ${GKS_SUBTLE_LIFT_SHADOW}`

/** Menu-tegels: zachter ingedrukt (geen harde “plop”). */
export const GKS_TILE_PRESS = [
  'transition-[transform,box-shadow,filter] duration-200 ease-out',
  'active:translate-y-[1px]',
  'active:brightness-[0.96]',
].join(' ')

/** Tik/klik: ingedrukt (inset + 2px omlaag), losgelaten = weer raised. */
export const GKS_BTN_PRESS = [
  'transition-[transform,box-shadow,filter,background] duration-100 ease-out',
  'active:translate-y-[2px]',
  'active:shadow-[inset_0_3px_8px_rgba(0,0,0,0.62),inset_0_1px_2px_rgba(0,0,0,0.38)]',
  'active:brightness-[0.9]',
  'active:border-[#1a1a1a]',
].join(' ')

const GKS_BTN_PRESS_FACE =
  'active:bg-[linear-gradient(180deg,#0e0e0e_0%,#242424_52%,#101010_100%)]'

/** Analoge klok op de balk — lichtere schaduw + highlight, “ligt erop”. */
export const GKS_CLOCK_TILE_ON_BAR = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'relative z-[2]',
  'border border-[#3d3d3d] border-t-[#4a4a4a]/80',
  'shadow-[0_1px_0_rgba(255,255,255,0.14),0_3px_8px_rgba(0,0,0,0.38),0_8px_16px_rgba(0,0,0,0.28)]',
  GKS_BTN_PRESS,
  GKS_BTN_PRESS_FACE,
].join(' ')

/** Native `disabled` (zeldzaam): zelfde kleur, geen pointer-events. */
export const GKS_BTN_DISABLED_SAME_LOOK =
  'disabled:opacity-100 disabled:cursor-not-allowed disabled:pointer-events-none'

/** Footer: `aria-disabled` — ingedrukt-effect blijft, actie in onClick geblokkeerd. */
export const GKS_BTN_ARIA_DISABLED = 'aria-disabled:cursor-not-allowed'

/** Standaard knop. */
export const GKS_POS_BTN = [
  GKS_BTN_FACE,
  GKS_BTN_EDGE,
  GKS_BTN_PRESS,
  GKS_BTN_PRESS_FACE,
  GKS_BTN_DISABLED_SAME_LOOK,
  'text-[#f0f0f0] disabled:text-[#f0f0f0]',
].join(' ')

/**
 * Geselecteerd (Menu open, NL, Ter plaatse, …): zelfde grijs + sterkere zwarte schaduw, blauwe tekst.
 */
export const GKS_POS_BTN_SELECTED = [
  GKS_BTN_FACE,
  'border border-[#2a2a2a]',
  GKS_POS_SELECTED_LIFT_SHADOW,
  GKS_BTN_PRESS,
  GKS_BTN_PRESS_FACE,
  GKS_POS_SELECTED_ACCENT_TEXT,
].join(' ')

/** Afrekenen — geselecteerde gloed + lichte extra (iets minder blauw dan geselecteerde knoppen). */
export const GKS_CHECKOUT_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_15px_37px_rgba(0,0,0,0.40),-7px_0_16px_rgba(0,0,0,0.40),7px_0_16px_rgba(0,0,0,0.40),0_6px_24px_rgba(26,127,216,0.44),0_0_22px_rgba(110,181,255,0.30),0_0_12px_rgba(110,181,255,0.34),0_8px_28px_rgba(26,127,216,0.30),0_0_18px_rgba(110,181,255,0.22)]'

/** Footer Afrekenen — geselecteerde look + altijd blauwe tekst. */
export const GKS_CHECKOUT_BTN = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'border border-[#2a2a2a]',
  GKS_CHECKOUT_LIFT_SHADOW,
  GKS_BTN_PRESS,
  GKS_BTN_PRESS_FACE,
  GKS_POS_SELECTED_ACCENT_TEXT,
  GKS_BTN_ARIA_DISABLED,
  'aria-disabled:text-[#6eb5ff]',
  'touch-manipulation',
].join(' ')

/**
 * Accent (actieve categorie-tab, bevestigingen) — cyan → koningsblauw.
 */
export const GKS_ACCENT_BTN = [
  GKS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#7ad9ff_0%,#4fb8f0_32%,#1a7fd8_62%,#004aad_100%)]',
  'text-white',
  'border border-[#003878] border-t-[#9ee8ff]/35',
  'shadow-[0_2px_5px_rgba(0,0,0,0.4),0_6px_14px_rgba(0,30,80,0.25)]',
  GKS_BTN_PRESS,
  GKS_BTN_DISABLED_SAME_LOOK,
  'active:bg-[linear-gradient(180deg,#4a9fd0_0%,#0d5bb8_55%,#002f75_100%)]',
  'active:border-[#002a66]',
  'disabled:text-white',
].join(' ')

/** Displayveld (totaal, numpad) — zelfde raised look als knoppen. */
export const GKS_POS_FIELD = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'border border-[#2a2a2a]',
  GKS_SUBTLE_LIFT_SHADOW,
].join(' ')

/** Onderstrook tegel — exact zelfde vlak als shell (`.gks-menu-plate-grain`). */
export const GKS_MENU_TILE_LABEL_SURFACE = GKS_MENU_PLATE_SHELL_BG_CLASS

/** @deprecated Gebruik `gksClockBarClass()` — zelfde basis als POS-knoppen. */
export const GKS_CLOCK_BAR = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'relative z-0',
  'border border-[#2a2a2a]',
  GKS_CLOCK_BAR_LIFT_SHADOW,
].join(' ')

export function gksPosButtonClass(selected: boolean): string {
  return `${GKS_BTN_SHAPE} ${selected ? GKS_POS_BTN_SELECTED : GKS_POS_BTN}`
}

/** Horizontale strook (totaal): exact dezelfde utility-reeks als een POS-knop. */
export function gksPosRaisedStripClass(): string {
  return gksPosButtonClass(false)
}

/** Klokbalk: 1:1 met order-type-knoppen (geen overflow-hidden — anders verdwijnt de schaduw). */
export function gksClockBarClass(): string {
  return `${gksPosButtonClass(false)} relative z-0`
}
