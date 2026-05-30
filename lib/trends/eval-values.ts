/**
 * Builds the TrendInputValues map used to drive an eval run.
 *
 * Image fields → the single eval-input image URL.
 * Text fields  → field.default (admin-provided eval-time sample).
 * Select fields → field.default ?? first option value.
 *
 * The result is consumable by `interpolatePrompt` + `collectImageInputs`.
 */

import type { TrendInput } from './input-schema'
import type { TrendInputValues } from './interpolate'

export function buildEvalValues(schema: TrendInput, evalImageUrl: string): TrendInputValues {
  const values: TrendInputValues = {}
  for (const field of schema.fields) {
    if (field.type === 'image') {
      values[field.name] = evalImageUrl
      continue
    }
    if (field.type === 'select') {
      values[field.name] = field.default ?? field.options[0]?.value ?? ''
      continue
    }
    // text
    values[field.name] = field.default ?? ''
  }
  return values
}
