'use client'

import { TextInput, useField } from '@payloadcms/ui'
import type { DefaultCellComponentProps, NumberFieldClientComponent } from 'payload'

// A euro amount stays a number; these only show it with two decimals (300.1 → "300.10").
const twoDecimals = (value: unknown) => (typeof value === 'number' ? value.toFixed(2) : '')

export const EurosCell = ({ cellData }: DefaultCellComponentProps) => <span>{twoDecimals(cellData)}</span>

export const EurosField: NumberFieldClientComponent = ({ field, path }) => {
  const { value } = useField<number>({ path })
  return <TextInput label={field.label} path={path} value={twoDecimals(value)} readOnly />
}
