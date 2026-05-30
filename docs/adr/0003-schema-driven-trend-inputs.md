# ADR 3: Schema-driven trend input forms via `trends.input_schema jsonb`

Date: 2026-05-29
Status: Accepted

## Context

Each trend in Trendly has its own input shape:
- "Action figure in box" needs 1 user photo + an optional style hint.
- "Cyberpunk passport" needs 1 photo + a country dropdown.
- "Pet to anime portrait" needs 1 photo of a pet + an optional name caption.

If trends shipped as hardcoded React forms, every new trend (we plan ~1/week per the Friday cadence in the SOP runbooks) would require a code deploy + Vercel build + Tailwind regeneration + cache invalidation. That's a 15–30 minute deployment overhead per trend launch, and it gates the operator on technical work to push content.

## Decision

Store the input shape as **JSONB on the `trends` table** (`input_schema` column, see [supabase/migrations/20260527000002_trends.sql](../../supabase/migrations/20260527000002_trends.sql)). The shape is validated at the type system level by a Zod discriminated union in [lib/trends/input-schema.ts](../../lib/trends/input-schema.ts):

```ts
const PhotoFieldSchema = z.object({
  type: z.literal('image'),
  name: z.string(),
  label: z.string(),
  required: z.boolean(),
  min_count: z.number().int().min(0),
  max_count: z.number().int().min(1),
})
const TextFieldSchema = z.object({ type: z.literal('string'), ... })
const SelectFieldSchema = z.object({ type: z.literal('select'), ... })
const IntFieldSchema = z.object({ type: z.literal('int'), ... })

export const TrendInputSchema = z.object({
  fields: z.array(z.discriminatedUnion('type', [
    PhotoFieldSchema, TextFieldSchema, SelectFieldSchema, IntFieldSchema,
  ])),
})
```

`SchemaForm.tsx` (referenced by [app/(public)/trend/[slug]/TrendUpload.tsx](../../app/(public)/trend/[slug]/TrendUpload.tsx)) renders the form dynamically by walking `input_schema.fields`. New trend → no code change. Admin edits `input_schema` in [app/admin/trends/TrendFormSections.tsx](../../app/admin/trends/TrendFormSections.tsx); the same Zod schema validates the admin save.

`interpolatePrompt()` in [lib/trends/interpolate.ts](../../lib/trends/interpolate.ts) substitutes field values into `trends.prompt_template` (e.g., `{user_photo}` becomes the storage URL, `{country}` becomes the dropdown selection).

## Consequences

**Positive:**
- Trend velocity: ship a new trend in ~30 minutes by editing rows in `/admin/trends/new`. No code, no deploy.
- The eval gate (ADR 4) works uniformly across all trends because the eval runner walks `input_schema` the same way the public form does.
- Buyers see a clean separation between "content" (trends, schemas, prompts in DB) and "infrastructure" (Next.js + Supabase + Gemini wrapper). The content can be edited/extended without engineering.

**Negative:**
- Runtime validation has to be very careful. A corrupt `input_schema` JSONB row (e.g., from a botched admin save) would crash the trend page. Mitigation: the repository function [lib/trends/repository.ts](../../lib/trends/repository.ts) `coerce()` falls back to `DEFAULT_TREND_INPUT` if Zod parsing fails, surfaced to Sentry — soft-fail rather than crash.
- TypeScript can't statically type the field set per trend. Calls like `values['user_photo']` are typed `string | string[] | undefined`. Acceptable for our scale; would be revisited if we crossed ~50 trends with many shared sub-shapes.
- The admin form for editing `input_schema` is a freeform JSON textarea + Zod validate-on-save (no per-field UI builder). Operator must understand the schema syntax. SOPs document the pattern; [docs/sops/daily_ops.md](../sops/daily_ops.md) references the new-trend workflow.

## Alternatives considered

**Separate columns per trend.** Rejected: every new trend = new migration = deploy cycle. Defeats the "ship new trend in 30 minutes" goal that's central to the content-moat pitch.

**TypeScript discriminated union over a `TrendInput` enum.** Rejected: compile-time only. Admins can't add new fields without an engineer involved. Loses the moat.

**Form-builder UI in admin (drag-and-drop field types).** Rejected: ~3–5 days of build time for marginal benefit. The current JSON-textarea + Zod validation is good enough for solo-builder velocity. Revisit if a second operator joins.
