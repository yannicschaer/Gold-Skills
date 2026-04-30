import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useCyclesStore, pickRelevantCycle } from '@/store/cycles'
import { useGoalsStore } from '@/store/goals'

function daysUntil(iso: string) {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function HomePage() {
  const { profile, user, canEditSkills } = useAuthStore()
  const { cycles, fetchCycles } = useCyclesStore()
  const { myGoals, fetchMyGoals } = useGoalsStore()
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const cycle = useMemo(() => pickRelevantCycle(cycles), [cycles])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  useEffect(() => {
    if (user && cycle) fetchMyGoals(user.id, cycle.id)
  }, [user, cycle, fetchMyGoals])

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-col gap-[4px]">
        <h2 className="font-heading text-[28px] font-medium leading-[1.3] tracking-[-0.2px] text-forest-950">
          Willkommen zurück{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="font-body text-[16px] leading-[1.5] text-neutral-500">
          Hier ist deine Team-Übersicht auf einen Blick.
        </p>
      </div>

      {canEditSkills && cycle && cycle.status === 'active' && (
        <Link
          to="/cycle"
          className="block rounded-lg border border-sand-200 bg-white p-[20px] hover:border-mint-400 transition-colors"
        >
          <div className="flex items-center justify-between gap-[16px]">
            <div className="min-w-0">
              <div className="flex items-center gap-[8px]">
                <span className="rounded-full bg-mint-50 px-[8px] py-[2px] text-[11px] font-medium text-mint-700">
                  Aktiver Cycle
                </span>
                <span className="font-body text-[16px] font-semibold text-forest-950 truncate">
                  {cycle.name}
                </span>
              </div>
              <p className="mt-[4px] font-body text-[13px] text-neutral-500">
                {myGoals.length === 0
                  ? 'Noch keine Fokus-Goals — leg jetzt 3-5 fest →'
                  : `${myGoals.length} Goals gesetzt — letzten Stand reviewen →`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-heading text-[24px] font-medium text-forest-950">
                {Math.max(0, daysUntil(cycle.end_date))}
              </div>
              <div className="font-body text-[11px] uppercase tracking-wide text-neutral-500">
                Tage übrig
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>
  )
}
