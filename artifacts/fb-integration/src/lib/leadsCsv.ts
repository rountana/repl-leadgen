/**
 * Escape a cell for CSV export and neutralize spreadsheet formulas in fields
 * submitted through public giveaway forms.
 */
export function escapeLeadCsvValue(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);

  // Spreadsheet applications can evaluate formulas after ignoring leading
  // whitespace or control characters, so check the first meaningful character.
  if (/^[\s\u0000-\u001f\u007f-\u009f\ufeff]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}