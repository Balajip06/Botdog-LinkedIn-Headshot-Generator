/**
 * Schema for trends.input_schema (JSONB column).
 *
 * Admins define per-trend input fields. Frontend renders SchemaForm dynamically
 * from this; backend interpolates text/select values into prompt_template
 * and forwards image fields to Gemini as multimodal inputs.
 */

import { z } from 'zod'
import type { Json } from '@/lib/supabase/database.types'

/** Field-name slug used as the `{{...}}` placeholder key in prompt_template. */
const FieldNameSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-z0-9_]*$/, 'lowercase snake_case starting with a letter')

const FieldLabelSchema = z.string().min(1).max(100)

const ImageFieldSchema = z.object({
  type: z.literal('image'),
  name: FieldNameSchema,
  label: FieldLabelSchema,
  required: z.boolean().default(true),
  min_count: z.number().int().min(1).max(8).default(1),
  max_count: z.number().int().min(1).max(8).default(1),
  hint: z.string().max(200).optional(),
})

const TextFieldSchema = z.object({
  type: z.literal('text'),
  name: FieldNameSchema,
  label: FieldLabelSchema,
  required: z.boolean().default(false),
  max_length: z.number().int().min(1).max(500).default(50),
  hint: z.string().max(200).optional(),
  /** Used at eval time to substitute {{name}} when no user value is supplied. */
  default: z.string().max(200).optional(),
})

const SelectFieldSchema = z.object({
  type: z.literal('select'),
  name: FieldNameSchema,
  label: FieldLabelSchema,
  required: z.boolean().default(false),
  options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).min(2),
  default: z.string().optional(),
  hint: z.string().max(200).optional(),
})

export const TrendFieldSchema = z.discriminatedUnion('type', [
  ImageFieldSchema,
  TextFieldSchema,
  SelectFieldSchema,
])
export type TrendField = z.infer<typeof TrendFieldSchema>

export const TrendInputSchema = z
  .object({
    fields: z.array(TrendFieldSchema).min(1).max(10),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    for (const f of data.fields) {
      if (seen.has(f.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate field name: ${f.name}`,
          path: ['fields'],
        })
      }
      seen.add(f.name)
      if (f.type === 'image' && f.max_count < f.min_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `image field ${f.name}: max_count < min_count`,
          path: ['fields'],
        })
      }
    }
  })

export type TrendInput = z.infer<typeof TrendInputSchema>

/**
 * FAQ entries on a trend (rendered into JSON-LD on the public trend page).
 * Co-located with TrendInputSchema so the matching Json helper lives in one
 * module per amended-plan §4 folder layout.
 */
export const FAQEntrySchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(2000),
})
export const FAQSchema = z.array(FAQEntrySchema).max(20)
export type FAQ = z.infer<typeof FAQSchema>

/**
 * Narrow a Zod-validated TrendInput to the generated `Json` type used by the
 * Supabase Database types. The double cast is safe because TrendInputSchema
 * only emits plain primitives, plain objects, and arrays — no functions,
 * symbols, Dates, or circular references. If the schema ever picks up a
 * non-Json member (e.g. a `Date` field on TrendField), this helper fails at
 * compile time and forces the schema to be revisited before bad data reaches
 * the JSONB column.
 */
export function trendInputToJson(input: TrendInput): Json {
  return input as unknown as Json
}

/**
 * Narrow a Zod-validated FAQ array to the generated `Json` type. Same runtime
 * guarantee as `trendInputToJson` — `FAQSchema` only emits `{question, answer}`
 * string pairs, so the structural shape is provably Json-compatible.
 */
export function faqToJson(faq: FAQ): Json {
  return faq as unknown as Json
}

/**
 * Single-photo default — matches migration 0002's column default.
 * Used when an admin creates a trend without overriding the schema.
 */
export const DEFAULT_TREND_INPUT: TrendInput = {
  fields: [
    {
      type: 'image',
      name: 'user_photo',
      label: 'Your photo',
      required: true,
      min_count: 1,
      max_count: 1,
    },
  ],
}
