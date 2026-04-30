/**
 * Migrates skill ratings from the Excel skill matrix into Supabase.
 *
 * Prerequisite: run scripts/extract-skill-ratings.py first to generate
 * gold-skills-imports/skill-ratings.json.
 *
 * Required env vars (loaded from .env):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (NOT the anon key — needed to bypass RLS for other users)
 *   VITE_SANITY_PROJECT_ID
 *   VITE_SANITY_DATASET
 *
 * Usage:
 *   node scripts/migrate-skill-ratings.mjs --dry-run    # preview, no writes
 *   node scripts/migrate-skill-ratings.mjs              # actually write
 *
 * Get the service role key: Supabase Dashboard → Settings → API → service_role secret.
 * Drop it into .env as SUPABASE_SERVICE_ROLE_KEY=eyJ...  (do NOT commit).
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient as createSanityClient } from '@sanity/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')
const JSON_PATH = resolve(REPO, 'gold-skills-imports', 'skill-ratings.json')

const dryRun = process.argv.includes('--dry-run')

// Manuelle Person→E-Mail Overrides, wenn das Excel-Team-Sheet
// veraltete oder abweichende Adressen hat.
const EMAIL_OVERRIDES = {
  'Yannic Schär': 'yannic.schaer@goldinteractive.ch',
}

// ── Load .env ───────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(REPO, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, key, valRaw] = m
      if (process.env[key]) continue
      const val = valRaw.replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  } catch {
    /* .env optional if vars are exported */
  }
}
loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const SANITY_PROJECT = process.env.VITE_SANITY_PROJECT_ID
const SANITY_DATASET = process.env.VITE_SANITY_DATASET || 'production'

if (!SUPABASE_URL || !SERVICE_ROLE || !SANITY_PROJECT) {
  console.error('Missing env vars. Required:')
  console.error('  VITE_SUPABASE_URL          =', SUPABASE_URL ? '✓' : '✗')
  console.error('  SUPABASE_SERVICE_ROLE_KEY  =', SERVICE_ROLE ? '✓' : '✗')
  console.error('  VITE_SANITY_PROJECT_ID     =', SANITY_PROJECT ? '✓' : '✗')
  process.exit(1)
}

const supabase = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const sanity = createSanityClient({
  projectId: SANITY_PROJECT,
  dataset: SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const clamp05 = (v) => Math.max(0, Math.min(5, Math.round(v)))

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

async function main() {
  console.log(dryRun ? '🔍 DRY RUN — no writes\n' : '✏️  Writing to Supabase\n')

  // 1) Load extracted JSON
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
  console.log(`Loaded ${data.people.length} people × ${data.skills.length} skills`)

  // 2) Fetch Sanity skills → title → _id
  const sanitySkills = await sanity.fetch(`*[_type == "skill"]{ _id, title }`)
  const skillByTitle = new Map()
  for (const s of sanitySkills) {
    if (s.title) skillByTitle.set(normalize(s.title), s._id)
  }
  console.log(`Sanity: ${sanitySkills.length} skills`)

  // 3) Fetch Supabase profiles → email/name → id
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
  if (pErr) throw pErr
  const profileByEmail = new Map()
  const profileByName = new Map()
  for (const p of profiles) {
    if (p.email) profileByEmail.set(normalize(p.email), p)
    if (p.full_name) profileByName.set(normalize(p.full_name), p)
  }
  console.log(`Supabase: ${profiles.length} profiles\n`)

  // 4) Pre-flight: skill match
  const missingSkills = []
  for (const sk of data.skills) {
    if (!skillByTitle.has(normalize(sk.title))) missingSkills.push(sk.title)
  }
  if (missingSkills.length) {
    console.log(`⚠️  ${missingSkills.length} Excel skills not found in Sanity:`)
    for (const t of missingSkills) console.log(`     - ${t}`)
    console.log('   These skills will be skipped for all people.\n')
  }

  // 5) For each person, resolve profile and build upsert payload
  const upserts = []
  const personSummary = []

  for (const person of data.people) {
    let profile = null
    let matchedBy = null
    const overrideEmail = EMAIL_OVERRIDES[person.name]
    if (overrideEmail) {
      profile = profileByEmail.get(normalize(overrideEmail))
      if (profile) matchedBy = `override ${overrideEmail}`
    }
    if (!profile && person.email) {
      profile = profileByEmail.get(normalize(person.email))
      if (profile) matchedBy = `email ${person.email}`
    }
    if (!profile) {
      profile = profileByName.get(normalize(person.name))
      if (profile) matchedBy = `name "${person.name}"`
    }

    if (!profile) {
      personSummary.push({
        name: person.name,
        status: 'SKIPPED — no matching profile',
      })
      continue
    }

    const ratings = data.ratings[person.name] ?? {}
    let count = 0
    for (const [title, levels] of Object.entries(ratings)) {
      const skillId = skillByTitle.get(normalize(title))
      if (!skillId) continue
      const current = levels.current == null ? 0 : clamp05(levels.current)
      const target = levels.target == null ? 0 : clamp05(levels.target)
      upserts.push({
        user_id: profile.id,
        skill_id: skillId,
        current_level: current,
        target_level: target,
      })
      count++
    }

    personSummary.push({
      name: person.name,
      profile: profile.email || profile.full_name,
      matchedBy,
      count,
    })
  }

  console.log('Person mapping:')
  for (const s of personSummary) {
    if (s.status) {
      console.log(`  ⚠️  ${s.name.padEnd(22)} ${s.status}`)
    } else {
      console.log(
        `  ✓  ${s.name.padEnd(22)} → ${String(s.profile).padEnd(40)} (${s.matchedBy}, ${s.count} ratings)`,
      )
    }
  }

  if (dryRun) {
    console.log(`\n🔍 Would upsert ${upserts.length} rows. Re-run without --dry-run to apply.`)
    return
  }

  // 6) Upsert in batches (PostgREST handles ~500 rows fine)
  console.log(`\nUpserting ${upserts.length} rows...`)
  const batchSize = 200
  let written = 0
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize)
    const { error } = await supabase
      .from('skill_ratings')
      .upsert(batch, { onConflict: 'user_id,skill_id' })
    if (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error)
      process.exit(1)
    }
    written += batch.length
    process.stdout.write(`  ${written}/${upserts.length}\r`)
  }
  console.log(`\n✅ Migrated ${written} skill ratings.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
