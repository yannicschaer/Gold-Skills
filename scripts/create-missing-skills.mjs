/**
 * Creates skills that exist in the Excel matrix but are missing in Sanity.
 *
 * Currently handles SEO (description from docx export) and AI (title only,
 * description left empty — fill in Studio).
 *
 * Idempotent: skips a skill if a document with the same slug already exists.
 *
 * Usage:
 *   SANITY_TOKEN=<editor-token> node scripts/create-missing-skills.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')

function loadEnv() {
  try {
    const raw = readFileSync(resolve(REPO, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, key, valRaw] = m
      if (process.env[key]) continue
      process.env[key] = valRaw.replace(/^["']|["']$/g, '')
    }
  } catch {
    /* optional */
  }
}
loadEnv()

const SANITY_PROJECT = process.env.VITE_SANITY_PROJECT_ID
const SANITY_DATASET = process.env.VITE_SANITY_DATASET || 'production'
const SANITY_TOKEN = process.env.SANITY_TOKEN

if (!SANITY_TOKEN) {
  console.error('Missing SANITY_TOKEN. Get one at manage.sanity.io → API → Tokens (Editor role).')
  process.exit(1)
}

const client = createClient({
  projectId: SANITY_PROJECT,
  dataset: SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: SANITY_TOKEN,
  useCdn: false,
})

const docxDescriptions = JSON.parse(
  readFileSync(resolve(REPO, 'gold-skills-imports', 'skill-descriptions-from-docx.json'), 'utf8'),
)

const CATEGORY_ID = 'cat-generelle-skills'

const skillsToCreate = [
  {
    title: 'SEO',
    slug: 'seo',
    order: 8,
    description: docxDescriptions['SEO'],
  },
  {
    title: 'AI',
    slug: 'ai',
    order: 9,
    description: undefined,
  },
]

async function main() {
  for (const s of skillsToCreate) {
    const existing = await client.fetch(
      `*[_type=="skill" && slug.current==$slug][0]{_id,title}`,
      { slug: s.slug },
    )
    if (existing) {
      console.log(`⏭  ${s.title} already exists (${existing._id}, title="${existing.title}") — skipping`)
      continue
    }

    const doc = {
      _type: 'skill',
      title: s.title,
      slug: { _type: 'slug', current: s.slug },
      category: { _type: 'reference', _ref: CATEGORY_ID },
      order: s.order,
      ...(s.description ? { description: s.description } : {}),
    }

    const created = await client.create(doc)
    const descNote = s.description ? `with description (${s.description.length} chars)` : 'no description'
    console.log(`✅ Created ${s.title} (${created._id}) — ${descNote}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
