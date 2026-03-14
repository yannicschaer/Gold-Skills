import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'gold-skills',
  title: 'Gold Skills',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || '20koyk2l',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
})
