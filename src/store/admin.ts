import { create } from 'zustand'
import type { Profile } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AdminState {
  members: Profile[]
  loading: boolean
  error: string | null
  fetchMembers: () => Promise<void>
  inviteMember: (email: string) => Promise<void>
  changeRole: (userId: string, role: 'admin' | 'designer' | 'operations') => Promise<void>
  deactivateMember: (userId: string) => Promise<void>
  reactivateMember: (userId: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
}

async function callAdminFunction(body: Record<string, unknown>) {
  const response = await supabase.functions.invoke('admin', { body })
  if (response.error) throw new Error(response.error.message)
  if (response.data?.error) throw new Error(response.data.error)
  return response.data
}

export const useAdminStore = create<AdminState>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  fetchMembers: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ members: (data ?? []) as Profile[], loading: false })
    }
  },

  inviteMember: async (email: string) => {
    set({ error: null })
    await callAdminFunction({ action: 'invite', email })
    await get().fetchMembers()
  },

  changeRole: async (userId: string, role: 'admin' | 'designer' | 'operations') => {
    set({ error: null })
    await callAdminFunction({ action: 'changeRole', userId, role })
    set({
      members: get().members.map((m) =>
        m.id === userId ? { ...m, role } : m,
      ),
    })
  },

  deactivateMember: async (userId: string) => {
    set({ error: null })
    await callAdminFunction({ action: 'deactivate', userId })
    set({
      members: get().members.map((m) =>
        m.id === userId ? { ...m, is_active: false } : m,
      ),
    })
  },

  reactivateMember: async (userId: string) => {
    set({ error: null })
    await callAdminFunction({ action: 'reactivate', userId })
    set({
      members: get().members.map((m) =>
        m.id === userId ? { ...m, is_active: true } : m,
      ),
    })
  },

  removeMember: async (userId: string) => {
    set({ error: null })
    await callAdminFunction({ action: 'remove', userId })
    set({
      members: get().members.filter((m) => m.id !== userId),
    })
  },
}))
