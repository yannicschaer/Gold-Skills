import { create } from 'zustand'
import { sanityClient } from '@/lib/sanity'
import type { SanityAppSettings, SanityLoginPage } from '@/types/sanity'

interface ContentState {
  appSettings: SanityAppSettings | null
  loginPage: SanityLoginPage | null
  contentLoading: boolean
  fetchAppSettings: () => Promise<void>
  fetchLoginPage: () => Promise<void>
}

const APP_SETTINGS_QUERY = `*[_type == "appSettings"][0]{
  _id, _type, appTitle, skillLevels
}`

const LOGIN_PAGE_QUERY = `*[_type == "loginPage"][0]{
  _id, _type, heading, subtitle, emailPlaceholder,
  splashTitle, splashSubtitle, featurePills,
  splashImage{ asset->{ url } }
}`

export const useContentStore = create<ContentState>((set) => ({
  appSettings: null,
  loginPage: null,
  contentLoading: false,

  fetchAppSettings: async () => {
    set({ contentLoading: true })
    try {
      const data = await sanityClient.fetch<SanityAppSettings>(APP_SETTINGS_QUERY)
      set({ appSettings: data, contentLoading: false })
    } catch (err) {
      console.error('Failed to fetch app settings from Sanity:', err)
      set({ contentLoading: false })
    }
  },

  fetchLoginPage: async () => {
    set({ contentLoading: true })
    try {
      const data = await sanityClient.fetch<SanityLoginPage>(LOGIN_PAGE_QUERY)
      set({ loginPage: data, contentLoading: false })
    } catch (err) {
      console.error('Failed to fetch login page from Sanity:', err)
      set({ contentLoading: false })
    }
  },
}))
