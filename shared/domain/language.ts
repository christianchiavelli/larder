import { z } from 'zod'

/**
 * The languages the data is read in: English, and Brazilian Portuguese, by the
 * codes the pages go by. The server picks product names and country names in
 * the asked one, and keeps the catalogue's taxonomy names in English.
 */
export const LANGUAGES = ['en', 'pt'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

/** A language from a query string; anything else is the default, never an error. */
export const languageSchema = z.enum(LANGUAGES).catch(DEFAULT_LANGUAGE)
