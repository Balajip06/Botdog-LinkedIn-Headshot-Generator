'use client'

import { useCallback, useState, type ChangeEvent } from 'react'
import type { TrendField, TrendInput } from '@/lib/trends/input-schema'
import type { TrendInputValues } from '@/lib/trends/interpolate'
import { cn } from '@/lib/utils/cn'

interface SchemaFormProps {
  schema: TrendInput
  /** Called with collected values + raw File list for image fields (uploader handles HEIC + resize + storage). */
  onSubmit: (payload: { values: TrendInputValues; files: Record<string, File[]> }) => void | Promise<void>
  submitting?: boolean
  ctaLabel?: string
  className?: string
}

type LocalState = {
  values: TrendInputValues
  files: Record<string, File[]>
  fieldErrors: Record<string, string | undefined>
}

const emptyState: LocalState = { values: {}, files: {}, fieldErrors: {} }

export function SchemaForm({
  schema,
  onSubmit,
  submitting = false,
  ctaLabel = 'Generate',
  className,
}: SchemaFormProps) {
  const [state, setState] = useState<LocalState>(emptyState)

  const setText = useCallback((name: string, value: string) => {
    setState((s) => ({ ...s, values: { ...s.values, [name]: value }, fieldErrors: { ...s.fieldErrors, [name]: undefined } }))
  }, [])

  const setFiles = useCallback((name: string, files: File[]) => {
    setState((s) => ({
      ...s,
      files: { ...s.files, [name]: files },
      fieldErrors: { ...s.fieldErrors, [name]: undefined },
    }))
  }, [])

  const validate = useCallback((): boolean => {
    const fieldErrors: Record<string, string> = {}
    for (const field of schema.fields) {
      if (field.type === 'image') {
        const files = state.files[field.name] ?? []
        if (field.required && files.length < field.min_count) {
          fieldErrors[field.name] = `Upload at least ${field.min_count} photo${field.min_count === 1 ? '' : 's'}`
        }
        if (files.length > field.max_count) {
          fieldErrors[field.name] = `Up to ${field.max_count} allowed`
        }
      } else {
        const value = state.values[field.name]
        if (field.required && (value === undefined || value === '')) {
          fieldErrors[field.name] = `${field.label} is required`
        }
      }
    }
    setState((s) => ({ ...s, fieldErrors }))
    return Object.keys(fieldErrors).length === 0
  }, [schema, state.files, state.values])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!validate()) return
      await onSubmit({ values: state.values, files: state.files })
    },
    [onSubmit, state.files, state.values, validate]
  )

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-5', className)}>
      {schema.fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          values={state.values}
          files={state.files}
          error={state.fieldErrors[field.name]}
          onText={setText}
          onFiles={setFiles}
        />
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-md bg-zinc-900 px-5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? 'Generating…' : ctaLabel}
      </button>
    </form>
  )
}

interface FieldRendererProps {
  field: TrendField
  values: TrendInputValues
  files: Record<string, File[]>
  error?: string
  onText: (name: string, value: string) => void
  onFiles: (name: string, files: File[]) => void
}

function FieldRenderer({ field, values, files, error, onText, onFiles }: FieldRendererProps) {
  const baseLabelClasses = 'text-sm font-medium text-zinc-900 dark:text-zinc-100'
  const inputClasses =
    'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50'

  if (field.type === 'image') {
    const selected = files[field.name] ?? []
    return (
      <label className="flex flex-col gap-1.5">
        <span className={baseLabelClasses}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </span>
        {field.hint && <span className="text-xs text-zinc-500">{field.hint}</span>}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple={field.max_count > 1}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const list = Array.from(e.target.files ?? []).slice(0, field.max_count)
            onFiles(field.name, list)
          }}
          className="text-sm text-zinc-600 dark:text-zinc-300"
        />
        {selected.length > 0 && (
          <span className="text-xs text-zinc-500">
            {selected.length} of max {field.max_count} selected
          </span>
        )}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </label>
    )
  }

  if (field.type === 'text') {
    return (
      <label className="flex flex-col gap-1.5">
        <span className={baseLabelClasses}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </span>
        {field.hint && <span className="text-xs text-zinc-500">{field.hint}</span>}
        <input
          type="text"
          maxLength={field.max_length}
          value={typeof values[field.name] === 'string' ? (values[field.name] as string) : ''}
          onChange={(e) => onText(field.name, e.target.value)}
          className={inputClasses}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </label>
    )
  }

  // select
  return (
    <label className="flex flex-col gap-1.5">
      <span className={baseLabelClasses}>
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </span>
      {field.hint && <span className="text-xs text-zinc-500">{field.hint}</span>}
      <select
        value={typeof values[field.name] === 'string' ? (values[field.name] as string) : (field.default ?? '')}
        onChange={(e) => onText(field.name, e.target.value)}
        className={inputClasses}
      >
        <option value="" disabled>
          Pick one…
        </option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  )
}
