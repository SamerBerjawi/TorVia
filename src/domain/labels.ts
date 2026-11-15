/** Rules for category and tag names (qBittorrent's own constraints, checked before we ask the server). */

/** Returns an error message, or null if `name` can be used as a new category. */
export function validateCategoryName(name: string, existing: Iterable<string>): string | null {
  const n = name.trim()
  if (n === '') return 'Enter a name'
  if (/^\/|\/$|\/\/|\\/.test(n)) return 'No leading, trailing or doubled “/”, and no “\\”'
  for (const e of existing) if (e.toLowerCase() === n.toLowerCase()) return 'That category already exists'
  return null
}

/** Splits user input on commas/newlines into unique, trimmed tags. Commas can't appear inside a tag. */
export function parseTagNames(input: string): string[] {
  return [...new Set(input.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))]
}

export function validateTagInput(input: string, existing: Iterable<string>): string | null {
  const names = parseTagNames(input)
  if (names.length === 0) return 'Enter at least one tag'
  const have = new Set([...existing].map((t) => t.toLowerCase()))
  const dupes = names.filter((t) => have.has(t.toLowerCase()))
  return dupes.length > 0 ? `Already exists: ${dupes.join(', ')}` : null
}

/** Rule names must be non-empty and unique (case-insensitive). */
export function validateRuleName(name: string, existing: Iterable<string>): string | null {
  const n = name.trim()
  if (n === '') return 'Enter a name'
  for (const e of existing) if (e.toLowerCase() === n.toLowerCase()) return 'A rule with that name already exists'
  return null
}
