import type { PatternRule } from '../types.js'

export const dateRule: PatternRule = {
  id: 'global.date',
  entityType: 'DATE',
  // A date of birth is personal data under the GDPR, but most dates in a
  // document are not — deadlines, invoice dates, meeting times. So dates stay
  // below the default bar and are masked either at a stricter sensitivity or
  // when the text says the date belongs to a person.
  patterns: [
    {
      name: 'Date (ISO)',
      regex: /\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
      score: 0.2,
    },
    {
      name: 'Date (day first)',
      regex: /\b(?:0?[1-9]|[12]\d|3[01])[./](?:0?[1-9]|1[0-2])[./](?:19|20)\d{2}\b/g,
      score: 0.2,
    },
    {
      name: 'Date (month first)',
      regex: /\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
      score: 0.15,
    },
  ],
  locales: null,
  context: [
    'urodzenia',
    'data urodzenia',
    'ur.',
    'born',
    'date of birth',
    'dob',
    'birthday',
    'geburtsdatum',
    'zgonu',
  ],
  description: 'Calendar date — masked when it reads as a date of birth, or at higher sensitivity',
}
