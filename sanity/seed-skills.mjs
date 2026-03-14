import { createClient } from '@sanity/client'

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error('Fehler: SANITY_TOKEN Umgebungsvariable fehlt.')
  console.error('SANITY_TOKEN=skXXX node seed-skills.mjs')
  process.exit(1)
}

const client = createClient({
  projectId: '20koyk2l',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const categories = [
  { _id: 'cat-research', slug: 'research', title: 'Research', order: 1 },
  { _id: 'cat-konzeption', slug: 'konzeption', title: 'Konzeption', order: 2 },
  { _id: 'cat-design', slug: 'design', title: 'Design', order: 3 },
  { _id: 'cat-testing', slug: 'testing', title: 'Testing', order: 4 },
  { _id: 'cat-generelle-skills', slug: 'generelle-skills', title: 'Generelle Skills', order: 5 },
]

const skills = [
  // Research
  { cat: 'cat-research', title: 'Research Prozess planen', order: 1 },
  { cat: 'cat-research', title: 'Nutzerinterviews', order: 2 },
  { cat: 'cat-research', title: 'Desk Research (Konkurrenzanalyse etc.)', order: 3 },
  { cat: 'cat-research', title: 'Umfragen', order: 4 },
  { cat: 'cat-research', title: 'Beobachtungen', order: 5 },
  { cat: 'cat-research', title: 'Analytics (GTM etc.)', order: 6 },
  { cat: 'cat-research', title: 'Workshops (Research Phase)', order: 7 },
  { cat: 'cat-research', title: 'Brand- und Strategie Research (Vision, Mission, etc.)', order: 8 },
  { cat: 'cat-research', title: 'Synthese', order: 9 },

  // Konzeption
  { cat: 'cat-konzeption', title: 'Business- und User Goals', order: 1 },
  { cat: 'cat-konzeption', title: 'Informationsarchitektur', order: 2 },
  { cat: 'cat-konzeption', title: 'Workshops (Konzeptions-Phase)', order: 3 },
  { cat: 'cat-konzeption', title: 'Use-Cases und Szenarien', order: 4 },
  { cat: 'cat-konzeption', title: 'User Flows', order: 5 },
  { cat: 'cat-konzeption', title: 'Requirements Engineering', order: 6 },
  { cat: 'cat-konzeption', title: 'UX Vision erarbeiten', order: 7 },
  { cat: 'cat-konzeption', title: 'Wireframes', order: 8 },

  // Design
  { cat: 'cat-design', title: 'UI Design', order: 1 },
  { cat: 'cat-design', title: 'Design Systems nutzen & pflegen', order: 2 },
  { cat: 'cat-design', title: 'Figma Anwendung', order: 3 },
  { cat: 'cat-design', title: 'Accessibility', order: 4 },
  { cat: 'cat-design', title: 'Icon/Illustration Design', order: 5 },
  { cat: 'cat-design', title: 'Animation/Motion Design', order: 6 },
  { cat: 'cat-design', title: 'Brand Design / Brand Experience', order: 7 },
  { cat: 'cat-design', title: 'Print', order: 8 },
  { cat: 'cat-design', title: 'Logo Design', order: 9 },
  { cat: 'cat-design', title: 'Bildsprache & Art Direction, Bildgenerierung', order: 10 },

  // Testing
  { cat: 'cat-testing', title: 'Usability Testing (moderiert & unmoderiert)', order: 1 },
  { cat: 'cat-testing', title: 'A/B Testing Konzepte', order: 2 },
  { cat: 'cat-testing', title: 'Hypothesen & Metriken validieren', order: 3 },
  { cat: 'cat-testing', title: 'Remote Testing (Maze, Useberry, Lookback)', order: 4 },
  { cat: 'cat-testing', title: 'Test Reporting', order: 5 },
  { cat: 'cat-testing', title: 'Heuristische Analysen', order: 6 },

  // Generelle Skills
  { cat: 'cat-generelle-skills', title: 'Agile Methoden (Scrum, Kanban, Design Sprints)', order: 1 },
  { cat: 'cat-generelle-skills', title: 'Technische Skills (CMS, HTML, CSS)', order: 2 },
  { cat: 'cat-generelle-skills', title: 'Workshop-Moderation', order: 3 },
  { cat: 'cat-generelle-skills', title: 'Präsentations- und Pitch-Skills', order: 4 },
  { cat: 'cat-generelle-skills', title: 'Zeit- und Selbstmanagement', order: 5 },
  { cat: 'cat-generelle-skills', title: 'Stakeholder-Kommunikation', order: 6 },
  { cat: 'cat-generelle-skills', title: 'UX Writing', order: 7 },
]

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m]))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function seed() {
  // Seed categories
  for (const cat of categories) {
    const doc = {
      _id: cat._id,
      _type: 'skillCategory',
      title: cat.title,
      slug: { _type: 'slug', current: cat.slug },
      order: cat.order,
    }
    console.log(`→ Kategorie: ${cat.title}`)
    await client.createOrReplace(doc)
  }

  // Seed skills
  for (const skill of skills) {
    const slug = slugify(skill.title)
    const doc = {
      _id: `skill-${slug}`,
      _type: 'skill',
      title: skill.title,
      slug: { _type: 'slug', current: slug },
      category: { _type: 'reference', _ref: skill.cat },
      order: skill.order,
    }
    console.log(`  → Skill: ${skill.title}`)
    await client.createOrReplace(doc)
  }

  console.log(`\n${categories.length} Kategorien und ${skills.length} Skills geseeded!`)
}

seed().catch((err) => {
  console.error('Seed fehlgeschlagen:', err.message)
  process.exit(1)
})
