import type { KeyboardLayoutObject } from 'simple-keyboard'

/** VS / internationaal QWERTY */
export const LAYOUT_QWERTY: KeyboardLayoutObject = {
  default: [
    '1 2 3 4 5 6 7 8 9 0',
    'q w e r t y u i o p',
    'a s d f g h j k l',
    '{shift} z x c v b n m {bksp}',
    '- . , @ {space} {enter}',
  ],
  shift: [
    '! ? # $ % ^ & * ( )',
    'Q W E R T Y U I O P',
    'A S D F G H J K L',
    '{shift} Z X C V B N M {bksp}',
    '_ ; : / + {space} {enter}',
  ],
}

/** BE/FR AZERTY (letters conform Belgisch toetsenbord) */
export const LAYOUT_AZERTY: KeyboardLayoutObject = {
  default: [
    '1 2 3 4 5 6 7 8 9 0',
    'a z e r t y u i o p',
    'q s d f g h j k l m',
    '{shift} w x c v b n , {bksp}',
    '. - @ & {space} {enter}',
  ],
  shift: [
    '° ! " # $ % ^ & * ( )',
    'A Z E R T Y U I O P',
    'Q S D F G H J K L M',
    '{shift} W X C V B N ? {bksp}',
    '; : / + = {space} {enter}',
  ],
}
