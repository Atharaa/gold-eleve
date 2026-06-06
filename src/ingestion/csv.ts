import { parse } from 'csv-parse/sync'

export type RawSeasonRow = Record<string, string>

export function parseSeasonCsv(text: string): RawSeasonRow[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawSeasonRow[]
}
