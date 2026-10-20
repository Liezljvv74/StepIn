'use client'

import { FieldError, TextInput, useField } from '@payloadcms/ui'
import { mergeFieldStyles } from '@payloadcms/ui/shared'
import type { DefaultCellComponentProps, NumberFieldClientComponent } from 'payload'
import { type ChangeEvent, useEffect, useState } from 'react'

import { toCents, toEuros } from '@/lib/format'

// Money is stored in integer cents (as Stripe expects); staff see and type euros.
export const EurosCell = ({ cellData }: DefaultCellComponentProps) => <span>{toEuros(cellData)}</span>

export const EurosField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<number | null>({ path })
  const [text, setText] = useState(() => toEuros(value))

  // Follow changes from outside the input (document loaded, form reset).
  useEffect(() => {
    if (!Object.is(toCents(text), value ?? null)) setText(toEuros(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <TextInput
      label={field.label}
      path={path}
      value={text}
      required={field.required}
      readOnly={readOnly || field.admin?.readOnly}
      placeholder="25.00"
      style={mergeFieldStyles(field)}
      showError={showError}
      Error={<FieldError path={path} message={errorMessage} showError={showError} />}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value)
        setValue(toCents(e.target.value))
      }}
    />
  )
}
