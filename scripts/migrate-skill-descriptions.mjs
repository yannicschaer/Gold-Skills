/**
 * Migrates skill descriptions to Sanity CMS.
 * Usage: SANITY_TOKEN=<your-write-token> node scripts/migrate-skill-descriptions.mjs
 *
 * Get a write token: manage.sanity.io → API → Tokens → Add API Token (Editor role)
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: '20koyk2l',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
})

const descriptions = {
  'Research-Prozess planen': 'Fähigkeit, den passenden Research-Ansatz für ein Projekt zu wählen, Methoden gezielt auszuwählen und in einen strukturierten Ablauf zu bringen. Berücksichtigt Ziele, Zeit, Budget und Stakeholder.',
  'Nutzerinterviews': 'Durchführung von Gesprächen mit Nutzenden, um deren Bedürfnisse, Erfahrungen und Erwartungen zu verstehen. Umfasst Vorbereitung, Moderation und Nachbereitung. Die Anwendung von unstrukturierten und strukturierten Interviewformen wird bewusst gewählt.',
  'Desk Research (Konkurrenzanalyse etc.)': 'Systematische Analyse bestehender Quellen wie Marktstudien, Konkurrenz-Websites oder Fachartikeln, um relevante Informationen für das Projekt abzuleiten.',
  'Umfragen': 'Erstellung und Durchführung strukturierter Fragebögen zur quantitativen Erhebung von Nutzermeinungen oder -verhalten. Auswertung und Einordnung der entsprechenden Daten sowie das Ableiten von Erkenntnissen.',
  'Beobachtungen': 'Systematisches Beobachten (Contextual Inquiries) von Nutzer:innen in ihrem Kontext, um Verhalten, Routinen und Probleme zu identifizieren.',
  'Analytics (GTM etc.)': 'Nutzung von Tracking- und Analysetools (z. B. Google Analytics, GTM), um Nutzerverhalten datengetrieben zu verstehen und zu bewerten.',
  'Workshops (Research Phase)': 'Gemeinsame Sessions mit Stakeholdern oder Nutzergruppen, um Wissen zu sammeln, Hypothesen zu prüfen oder Anforderungen zu schärfen.',
  'Brand- und Strategierecherche (Vision, Mission, etc.)': 'Analyse von Markenwerten, Vision, Mission und strategischen Zielen als Grundlage für Designentscheidungen und konsistente Nutzererlebnisse.',
  'Synthese': 'Zusammenführung und Verdichtung von Research-Ergebnissen, um Muster, Insights und Handlungsempfehlungen abzuleiten.',
  'Business- und User-Goals': 'Verständnis und Abgleich von Geschäftszielen mit den Bedürfnissen der Nutzer:innen, um eine tragfähige UX-Strategie zu entwickeln.',
  'Informationsarchitektur': 'Strukturierung und Organisation von Inhalten, Navigation und Interaktionsmöglichkeiten, sodass Informationen leicht auffindbar sind. Die Informationsarchitektur kann begründet werden und wurde evidenzbasiert erarbeitet.',
  'Workshops (Konzeptions-Phase)': 'Gemeinsame Entwicklung von Ideen, Konzepten oder Lösungsansätzen mit Stakeholdern und Teammitgliedern. Befindet sich mehr im Lösungsbereich, als im Research-Teil.',
  'Use-Cases und Szenarien': 'Beschreibung typischer Anwendungsfälle und Nutzungsszenarien, um Anforderungen greifbar zu machen.',
  'User Flows & User Story Maps': 'Darstellung der einzelnen Schritte, die Nutzer:innen durchlaufen, um ein Ziel im System zu erreichen. Umfasst generell die Erarbeitung von User Journeys/User Story Maps etc.',
  'Requirements-Engineering': 'Systematische Erhebung, Dokumentation und Priorisierung von Anforderungen als Grundlage für die Produktentwicklung. Dies geschieht in enger Zusammenarbeit mit den Tech-Leads, Entwicklern und/oder Projektleitern.',
  'UX-Vision erarbeiten': 'Definition eines langfristigen Zielbilds für die Nutzererfahrung, das als Leitlinie für Designentscheidungen dient. Deckt sowohl Benutzer- als auch Geschäftsziele ab.',
  'Wireframes': 'Erstellung schematischer Darstellungen zur Visualisierung von Strukturen, Layouts und Abläufen ohne Detaildesign. Geschieht oft zu Beginn des Designprozesses und dient unter anderem als Grundlage einer fundierten Informationsarchitektur.',
  'UI-Design': 'Gestaltung visueller Oberflächen mit Fokus auf Ästhetik, Konsistenz, Benutzerfreundlichkeit und Markenidentität. Die Designentscheidungen spiegeln die im Vorfeld definierte UX-Vision/Strategie. Entscheidungen werden bewusst getroffen und können erläutert werden.',
  'Design Systems nutzen & pflegen': 'Anwendung, Dokumentation und Weiterentwicklung von Designsystemen (Komponenten, Patterns, Guidelines).',
  'Figma Anwendung': 'Effiziente und sichere Nutzung von Figma für Design, Prototyping und Zusammenarbeit im Team.',
  'Accessibility': 'Berücksichtigung von Barrierefreiheit in Design und Umsetzung, damit Produkte inklusiv nutzbar sind.',
  'Icon/Illustration Design': 'Gestaltung von Icons und Illustrationen, die Funktionen, Inhalte oder Markenwerte klar unterstützen.',
  'Animation/Motion Design': 'Nutzung von Animationen zur Unterstützung von Interaktionen, Feedback oder Storytelling im digitalen Produkt.',
  'Brand Design / Brand Experience': 'Entwicklung und Anwendung eines konsistenten Markenauftritts über verschiedene Touchpoints hinweg.',
  'Print': 'Gestaltung von Printprodukten (z. B. Flyer, Broschüren, Poster) im Einklang mit der Markenidentität.',
  'Logo Design': 'Entwicklung und Gestaltung von Logos, die Markenwerte und Identität klar und einprägsam kommunizieren. Umfasst den kreativen Entwurfsprozess, die Form- und Typografieauswahl sowie die Sicherstellung von Anwendbarkeit in verschiedenen Medien und Formaten.',
  'Bildsprache & Art Direction, Bildgenerierung': 'Definition und Steuerung der visuellen Bildwelt einer Marke oder eines Projekts. Dazu gehören die Entwicklung eines konsistenten Bildstils, die Auswahl und Gestaltung von Fotografien, Illustrationen oder generierten Bildern (z. B. KI-generiert), sowie die kreative Leitung bei deren Umsetzung, um eine kohärente Markenwirkung zu erzielen.',
  'Usability Testing (moderiert & unmoderiert)': 'Planung und Durchführung von Tests mit Nutzenden, um die Bedienbarkeit und Nutzerfreundlichkeit zu evaluieren.',
  'A/B Testing Konzepte': 'Entwicklung von Testvarianten, um unterschiedliche Design- oder Funktionsansätze datenbasiert zu vergleichen.',
  'Hypothesen & Metriken validieren': 'Formulierung von Hypothesen und Festlegung von Messgrössen, um Annahmen systematisch zu überprüfen.',
  'Remote Testing (Maze, Useberry, Lookback)': 'Durchführung von Nutzertests mit Online-Tools, um Feedback effizient und ortsunabhängig zu sammeln.',
  'Test Reporting': 'Aufbereitung und Präsentation der Ergebnisse von Tests in klaren, umsetzbaren Empfehlungen.',
  'Heuristische Analysen': 'Bewertung einer Anwendung anhand von Usability-Heuristiken, um Schwachstellen und Optimierungspotenziale zu identifizieren.',
  'Agile Methoden (Scrum, Kanban, Design Sprints)': 'Anwendung agiler Frameworks zur iterativen und kollaborativen Produktentwicklung.',
  'Technische Skills (CMS, HTML, CSS)': 'Grundverständnis für Content-Management-Systeme sowie HTML- und CSS-Kenntnisse zur besseren Zusammenarbeit mit Entwickler:innen.',
  'Workshop-Moderation': 'Planung, Durchführung und Steuerung von Workshops mit klaren Zielen, Methoden und Dokumentation.',
  'Präsentations- und Pitch-Skills': 'Fähigkeit, Inhalte überzeugend und verständlich zu präsentieren, um Stakeholder zu gewinnen.',
  'Zeit- und Selbstmanagement': 'Effiziente Organisation eigener Aufgaben und Prioritäten, um Deadlines und Qualität sicherzustellen.',
  'Stakeholder-Kommunikation': 'Klarer und adressatengerechter Austausch mit internen und externen Stakeholdern, um Entscheidungen voranzubringen.',
  'SEO': 'Kenntnisse in Suchmaschinenoptimierung, um Inhalte und Strukturen so aufzubereiten, dass sie besser gefunden werden.',
  'UX Writing': 'Gestaltung von Microcopy, Texten und Botschaften im Interface, um Nutzer:innen klar und hilfreich zu führen.',
}

async function run() {
  if (!process.env.SANITY_TOKEN) {
    console.error('Error: SANITY_TOKEN environment variable is required.')
    console.error('Get a token at: manage.sanity.io → API → Tokens → Add API Token (Editor role)')
    process.exit(1)
  }

  console.log('Fetching skills from Sanity...')
  const skills = await client.fetch(`*[_type == "skill"] { _id, title }`)
  console.log(`Found ${skills.length} skills.\n`)

  let updated = 0
  let notFound = []

  for (const [title, description] of Object.entries(descriptions)) {
    const skill = skills.find((s) => s.title.trim() === title.trim())
    if (!skill) {
      notFound.push(title)
      continue
    }
    await client.patch(skill._id).set({ description }).commit()
    console.log(`✓ ${title}`)
    updated++
  }

  console.log(`\n✅ Updated ${updated} skills.`)
  if (notFound.length > 0) {
    console.log(`\n⚠️  Not found in Sanity (title mismatch?):`)
    notFound.forEach((t) => console.log(`   - ${t}`))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
