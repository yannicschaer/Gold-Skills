import { createClient } from '@sanity/client'

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error('Fehler: SANITY_TOKEN Umgebungsvariable fehlt.')
  console.error('Erstelle einen Token unter: https://www.sanity.io/manage/project/20koyk2l/api#tokens')
  console.error('Dann: SANITY_TOKEN=skXXX node seed.mjs')
  process.exit(1)
}

const client = createClient({
  projectId: '20koyk2l',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const documents = [
  {
    _id: 'appSettings',
    _type: 'appSettings',
    appTitle: 'Gold Skills',
    skillLevels: [
      { _key: 'l0', value: 0, label: 'Keine Erfahrung' },
      { _key: 'l1', value: 1, label: 'Grundkenntnisse' },
      { _key: 'l2', value: 2, label: 'Fortgeschritten' },
      { _key: 'l3', value: 3, label: 'Erfahren' },
      { _key: 'l4', value: 4, label: 'Experte' },
      { _key: 'l5', value: 5, label: 'Führend' },
    ],
  },
  {
    _id: 'loginPage',
    _type: 'loginPage',
    heading: 'Willkommen bei Gold Skills',
    subtitle: 'Melde dich an, um deine Skills zu verwalten und die Teamübersicht einzusehen.',
    emailPlaceholder: 'name@goldinteractive.ch',
    splashTitle: 'Gold Skills',
    splashSubtitle: 'Erfasse und visualisiere die Skills deines Teams — transparent und einfach.',
    featurePills: ['Skill-Matrix', 'Team-Übersicht', 'Radar-Charts', 'Ist vs. Soll'],
  },
]

async function seed() {
  for (const doc of documents) {
    console.log(`→ Erstelle/aktualisiere: ${doc._type} (${doc._id})`)
    await client.createOrReplace(doc)
    console.log(`  ✓ ${doc._type} gespeichert`)
  }
  console.log('\nSeed abgeschlossen!')
}

seed().catch((err) => {
  console.error('Seed fehlgeschlagen:', err.message)
  process.exit(1)
})
