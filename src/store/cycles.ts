import { create } from 'zustand'
import type { CycleStatus, DevelopmentCycle } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface CyclesState {
  cycles: DevelopmentCycle[]
  loading: boolean

  fetchCycles: () => Promise<void>
  createCycle: (input: {
    name: string
    start_date: string
    end_date: string
    status?: CycleStatus
  }) => Promise<DevelopmentCycle | null>
  updateCycle: (
    id: string,
    updates: Partial<Pick<DevelopmentCycle, 'name' | 'start_date' | 'end_date' | 'status'>>,
  ) => Promise<void>
  deleteCycle: (id: string) => Promise<void>
}

export const useCyclesStore = create<CyclesState>((set, get) => ({
  cycles: [],
  loading: false,

  fetchCycles: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('development_cycles')
      .select('*')
      .order('start_date', { ascending: false })
    if (error) console.error('Fetch cycles failed:', error)
    if (data) set({ cycles: data as DevelopmentCycle[] })
    set({ loading: false })
  },

  createCycle: async ({ name, start_date, end_date, status = 'upcoming' }) => {
    const { data, error } = await supabase
      .from('development_cycles')
      .insert({ name, start_date, end_date, status } as never)
      .select()
      .single()
    if (error) {
      console.error('Create cycle failed:', error)
      return null
    }
    await get().fetchCycles()
    return data as DevelopmentCycle
  },

  updateCycle: async (id, updates) => {
    const { error } = await supabase
      .from('development_cycles')
      .update(updates as never)
      .eq('id', id)
    if (error) {
      console.error('Update cycle failed:', error)
      return
    }
    await get().fetchCycles()
  },

  deleteCycle: async (id) => {
    const { error } = await supabase.from('development_cycles').delete().eq('id', id)
    if (error) {
      console.error('Delete cycle failed:', error)
      return
    }
    await get().fetchCycles()
  },
}))

/**
 * Wählt aus einer Liste von Cycles den derzeit aktiven (oder fallback
 * den nächsten upcoming, sonst den letzten closed).
 */
export function pickRelevantCycle(cycles: DevelopmentCycle[]): DevelopmentCycle | null {
  const active = cycles.find((c) => c.status === 'active')
  if (active) return active
  const upcoming = cycles
    .filter((c) => c.status === 'upcoming')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0]
  if (upcoming) return upcoming
  const closed = cycles
    .filter((c) => c.status === 'closed')
    .sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
  return closed ?? null
}
