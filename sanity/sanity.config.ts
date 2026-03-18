import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

const singletonTypes = new Set(['appSettings', 'loginPage'])
const singletonActions = new Set(['publish', 'discardChanges', 'restore'])

export default defineConfig({
  name: 'gold-skills',
  title: 'Gold Skills',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || '20koyk2l',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Inhalte')
          .items([
            S.listItem()
              .title('App-Einstellungen')
              .id('appSettings')
              .child(
                S.document()
                  .schemaType('appSettings')
                  .documentId('appSettings'),
              ),
            S.listItem()
              .title('Login-Seite')
              .id('loginPage')
              .child(
                S.document()
                  .schemaType('loginPage')
                  .documentId('loginPage'),
              ),
            S.divider(),
            S.documentTypeListItem('skillCategory').title('Skill-Kategorien'),
            S.documentTypeListItem('skill').title('Skills'),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(({ action }) => action && singletonActions.has(action))
        : input,
  },
})
