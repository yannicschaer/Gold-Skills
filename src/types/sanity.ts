export interface SanitySkillCategory {
  _id: string
  _type: 'skillCategory'
  title: string
  slug: string
  order: number
  description?: string
}

export interface SanitySkill {
  _id: string
  _type: 'skill'
  title: string
  slug: string
  category: {
    _ref: string
    title?: string
  }
  description?: string
  order: number
}

export interface SkillWithCategory extends SanitySkill {
  categoryTitle: string
  categorySlug: string
}

export interface SanitySkillLevel {
  value: number
  label: string
}

export interface SanityAppSettings {
  _id: string
  _type: 'appSettings'
  appTitle: string
  skillLevels: SanitySkillLevel[]
}

export interface SanityLoginPage {
  _id: string
  _type: 'loginPage'
  heading: string
  subtitle: string
  emailPlaceholder?: string
  splashTitle: string
  splashSubtitle: string
  featurePills: string[]
  splashImage?: {
    asset: {
      url: string
    }
  }
}
