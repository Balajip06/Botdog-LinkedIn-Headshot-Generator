import type { ReactNode } from 'react'

interface TrendFormValues {
  slug?: string
  title?: string
  description?: string | null
  prompt_template?: string
  model?: 'nano-banana' | 'nano-banana-pro'
  aspect_ratio?: '1:1' | '3:4' | '16:9' | '9:16'
  display_order?: number
  thumbnail_url?: string | null
  sample_before_url?: string | null
  sample_after_url?: string | null
  seo_title?: string | null
  seo_description?: string | null
  input_schema?: unknown
  faq?: unknown
}

interface TrendFormProps {
  action: (formData: FormData) => Promise<void>
  initial?: TrendFormValues
  submitLabel: string
  /** Read-only banner content (success/error) rendered above the form. */
  banner?: ReactNode
  /** Extra actions (e.g. toggleActive) below submit. */
  extraActions?: ReactNode
}

const inputClasses =
  'h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50'

const textareaClasses =
  'min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50'

const labelClasses = 'text-xs font-medium uppercase tracking-wide text-zinc-500'

function jsonString(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export function TrendForm({ action, initial = {}, submitLabel, banner, extraActions }: TrendFormProps) {
  return (
    <form action={action} className="flex flex-col gap-6">
      {banner}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Title</span>
          <input name="title" required maxLength={200} defaultValue={initial.title ?? ''} className={inputClasses} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Slug (kebab-case)</span>
          <input
            name="slug"
            required
            pattern="^[a-z][a-z0-9-]*$"
            maxLength={120}
            defaultValue={initial.slug ?? ''}
            className={inputClasses}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClasses}>Description</span>
        <textarea
          name="description"
          maxLength={1000}
          defaultValue={initial.description ?? ''}
          className={textareaClasses + ' font-sans text-sm'}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClasses}>Prompt template (use {`{{field_name}}`} for schema substitution)</span>
        <textarea
          name="prompt_template"
          required
          minLength={10}
          maxLength={2000}
          defaultValue={initial.prompt_template ?? ''}
          className={textareaClasses + ' min-h-32'}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Model</span>
          <select name="model" defaultValue={initial.model ?? 'nano-banana-pro'} className={inputClasses}>
            <option value="nano-banana-pro">nano-banana-pro</option>
            <option value="nano-banana">nano-banana (quick)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Aspect ratio</span>
          <select name="aspect_ratio" defaultValue={initial.aspect_ratio ?? '1:1'} className={inputClasses}>
            <option value="1:1">1:1</option>
            <option value="3:4">3:4</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Display order</span>
          <input
            type="number"
            name="display_order"
            min={0}
            max={9999}
            defaultValue={initial.display_order ?? 0}
            className={inputClasses}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Thumbnail URL</span>
          <input
            name="thumbnail_url"
            type="url"
            defaultValue={initial.thumbnail_url ?? ''}
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Sample before URL</span>
          <input
            name="sample_before_url"
            type="url"
            defaultValue={initial.sample_before_url ?? ''}
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>Sample after URL</span>
          <input
            name="sample_after_url"
            type="url"
            defaultValue={initial.sample_after_url ?? ''}
            className={inputClasses}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>SEO title</span>
          <input
            name="seo_title"
            maxLength={200}
            defaultValue={initial.seo_title ?? ''}
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClasses}>SEO description</span>
          <input
            name="seo_description"
            maxLength={300}
            defaultValue={initial.seo_description ?? ''}
            className={inputClasses}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClasses}>Input schema (JSON — see lib/trends/input-schema.ts)</span>
        <textarea
          name="input_schema"
          defaultValue={jsonString(initial.input_schema)}
          placeholder='{"fields":[{"type":"image","name":"user_photo","label":"Your photo","required":true,"min_count":1,"max_count":1}]}'
          className={textareaClasses + ' min-h-32'}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClasses}>FAQ (JSON array of {`{question, answer}`})</span>
        <textarea
          name="faq"
          defaultValue={jsonString(initial.faq)}
          placeholder='[{"question":"Is it free?","answer":"5 free per week."}]'
          className={textareaClasses + ' min-h-32'}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitLabel}
        </button>
        {extraActions}
      </div>
    </form>
  )
}
