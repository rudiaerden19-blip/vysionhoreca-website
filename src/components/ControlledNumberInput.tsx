'use client'

import { useState, type InputHTMLAttributes } from 'react'
import {
  isPartialNumberInput,
  numberFieldDisplayValue,
  optionalNumberFieldDisplay,
  parseNumberFieldValue,
  parseOptionalNumberFieldValue,
} from '@/lib/controlled-number-input'

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>

type ControlledNumberInputProps = BaseProps & {
  value: number
  onChange: (value: number) => void
  integer?: boolean
  emptyWhenZero?: boolean
}

/** Decimal/komma-veld: number in state, partial "3," / "12." blijft zichtbaar tijdens typen. */
export function ControlledNumberInput({
  value,
  onChange,
  integer,
  emptyWhenZero,
  onBlur,
  inputMode,
  ...rest
}: ControlledNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const display = draft !== null ? draft : numberFieldDisplayValue(value, { emptyWhenZero })

  const resolvedInputMode = inputMode ?? (integer ? 'numeric' : 'decimal')

  return (
    <input
      {...rest}
      type="text"
      inputMode={resolvedInputMode}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-no-capitalize="true"
      data-vysion-number-input="true"
      value={display}
      onChange={(e) => {
        const raw = e.target.value
        if (!isPartialNumberInput(raw, { integer })) return
        setDraft(raw)
        onChange(parseNumberFieldValue(raw, { integer }))
      }}
      onBlur={(e) => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}

type ControlledOptionalNumberInputProps = BaseProps & {
  value: number | undefined
  onChange: (value: number | undefined) => void
  integer?: boolean
}

export function ControlledOptionalNumberInput({
  value,
  onChange,
  integer,
  onBlur,
  inputMode,
  ...rest
}: ControlledOptionalNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const display = draft !== null ? draft : optionalNumberFieldDisplay(value)

  const resolvedInputMode = inputMode ?? (integer ? 'numeric' : 'decimal')

  return (
    <input
      {...rest}
      type="text"
      inputMode={resolvedInputMode}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-no-capitalize="true"
      data-vysion-number-input="true"
      value={display}
      onChange={(e) => {
        const raw = e.target.value
        if (!isPartialNumberInput(raw, { integer })) return
        setDraft(raw)
        onChange(parseOptionalNumberFieldValue(raw, { integer }))
      }}
      onBlur={(e) => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}
