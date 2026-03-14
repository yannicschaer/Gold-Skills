import { defineField, defineType } from 'sanity'

export const appSettings = defineType({
  name: 'appSettings',
  title: 'App-Einstellungen',
  type: 'document',
  fields: [
    defineField({
      name: 'appTitle',
      title: 'App-Titel',
      type: 'string',
      description: 'Wird in der Navigation und im Browser-Tab angezeigt.',
      validation: (rule) => rule.required(),
      initialValue: 'Gold Skills',
    }),
    defineField({
      name: 'skillLevels',
      title: 'Skill-Level Skala',
      type: 'array',
      description: 'Labels für die Skill-Bewertungsskala (0-5). Genau 6 Einträge erforderlich.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Wert',
              type: 'number',
              validation: (rule) => rule.required().min(0).max(5),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
            prepare: ({ title, subtitle }) => ({
              title: `${subtitle} - ${title}`,
            }),
          },
        },
      ],
      validation: (rule) =>
        rule.required().length(6).error('Genau 6 Skill-Level erforderlich (0-5).'),
    }),
  ],
  preview: {
    prepare: () => ({
      title: 'App-Einstellungen',
    }),
  },
})
