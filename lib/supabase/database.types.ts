// Placeholder — regenerate with `pnpm supabase:types` once supabase is running locally.
// Loose index-signature shape so the project typechecks before real types exist;
// once `pnpm supabase:types` runs against the live DB, this file is overwritten with strict types.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type GenericRow = Record<string, Json | unknown>

type GenericTable = {
  Row: GenericRow
  Insert: GenericRow
  Update: GenericRow
  Relationships: []
}

export interface Database {
  public: {
    Tables: { [tableName: string]: GenericTable }
    Views: { [viewName: string]: { Row: GenericRow } }
    Functions: { [fnName: string]: { Args: GenericRow; Returns: unknown } }
    Enums: { [enumName: string]: string }
    CompositeTypes: { [typeName: string]: GenericRow }
  }
}
