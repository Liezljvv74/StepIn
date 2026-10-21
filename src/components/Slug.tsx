'use client'

import { TextField, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useRef } from 'react'

import { slugWithDate } from '@/lib/slug'

// Shows the slug as the name and date are typed. A slug typed by hand is left
// alone. Saving applies the same rule on the server (collections/Events.ts).
export const SlugField: TextFieldClientComponent = (props) => {
  const { value, setValue } = useField<string>({ path: props.path })
  const name = useFormFields(([fields]) => fields.name?.value as string | undefined)
  const date = useFormFields(([fields]) => fields.date?.value as string | undefined)
  const generated = slugWithDate({ data: { date }, valueToSlugify: name }) ?? ''
  const lastGenerated = useRef(generated)

  useEffect(() => {
    if (generated === lastGenerated.current) return
    if (!value || value === lastGenerated.current) setValue(generated)
    lastGenerated.current = generated
  }, [generated, value, setValue])

  return <TextField {...props} />
}
