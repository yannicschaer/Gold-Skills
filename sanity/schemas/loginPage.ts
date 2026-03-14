import { defineField, defineType } from 'sanity'

export const loginPage = defineType({
  name: 'loginPage',
  title: 'Login-Seite',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Überschrift',
      type: 'string',
      description: 'Hauptüberschrift über dem Login-Formular.',
      validation: (rule) => rule.required(),
      initialValue: 'Willkommen bei Gold Skills',
    }),
    defineField({
      name: 'subtitle',
      title: 'Untertitel',
      type: 'text',
      rows: 2,
      description: 'Beschreibungstext unter der Überschrift.',
      validation: (rule) => rule.required(),
      initialValue:
        'Melde dich an, um deine Skills zu verwalten und die Teamübersicht einzusehen.',
    }),
    defineField({
      name: 'emailPlaceholder',
      title: 'E-Mail Platzhalter',
      type: 'string',
      description: 'Platzhaltertext im E-Mail-Feld.',
      initialValue: 'name@goldinteractive.ch',
    }),
    defineField({
      name: 'splashTitle',
      title: 'Splash-Titel',
      type: 'string',
      description: 'Grosser Titel auf der rechten Seite.',
      validation: (rule) => rule.required(),
      initialValue: 'Gold Skills',
    }),
    defineField({
      name: 'splashSubtitle',
      title: 'Splash-Untertitel',
      type: 'text',
      rows: 2,
      description: 'Beschreibungstext unter dem Splash-Titel.',
      validation: (rule) => rule.required(),
      initialValue:
        'Erfasse und visualisiere die Skills deines Teams — transparent und einfach.',
    }),
    defineField({
      name: 'featurePills',
      title: 'Feature-Pills',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Feature-Schlagwörter, die als Pills angezeigt werden.',
      initialValue: [
        'Skill-Matrix',
        'Team-Übersicht',
        'Radar-Charts',
        'Ist vs. Soll',
      ],
    }),
    defineField({
      name: 'splashImage',
      title: 'Splash-Bild',
      type: 'image',
      description:
        'Dekorationsbild auf der rechten Seite. Optional — falls leer wird die Animation verwendet.',
      options: {
        accept: 'image/svg+xml,image/png,image/jpeg',
      },
    }),
  ],
  preview: {
    prepare: () => ({
      title: 'Login-Seite',
    }),
  },
})
