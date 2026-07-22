// Shared merge rules for applying a scrape to the add/edit form model.

import type { ProcessGameImageResult } from '@/api'

/**
 * Scraped fields already converted to gameData shapes (releaseDate is a
 * local-midnight ms timestamp), holding only the entries the user checked.
 */
export interface ScrapedFields {
  title?: string
  releaseDate?: number | null
  communityScore?: number
  developer?: string[]
  publisher?: string[]
  genre?: string[]
  tags?: string[]
  description?: string[]
  links?: { name: string; url: string }[]
}

export interface ScrapeApplyPayload {
  fields: ScrapedFields
  /** Already downloaded into the temp slot; previewUrl is an asset URL */
  cover?: ProcessGameImageResult
  background?: ProcessGameImageResult
}

/**
 * Merge scraped fields into the form model: scalars overwrite, array fields
 * union with the existing values (an edited game keeps its own tags), links
 * dedupe by url.
 */
export function applyScrapedFields(form: gameData, fields: ScrapedFields) {
  if (fields.title !== undefined) form.title = fields.title
  if (fields.releaseDate !== undefined) form.releaseDate = fields.releaseDate
  if (fields.communityScore !== undefined) form.communityScore = fields.communityScore
  if (fields.description !== undefined) form.description = fields.description

  for (const key of ['developer', 'publisher', 'genre', 'tags'] as const) {
    const incoming = fields[key]
    if (!incoming?.length) continue
    form[key] = [...new Set([...form[key], ...incoming])]
  }

  if (fields.links?.length) {
    const existing = new Set(form.links.map(l => l.url))
    form.links = [...form.links, ...fields.links.filter(l => !existing.has(l.url))]
  }
}
