import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useSkillsStore } from '@/store/skills'
import { supabase } from '@/lib/supabase'
import type { Profile, SkillRating } from '@/types/database'
import {
  addToCounts,
  emptyCounts,
  getConfirmationState,
  type StatusCounts,
} from '@/lib/confirmation'

interface ReportRow {
  profile: Profile
  counts: StatusCounts
  lastConfirmedAt: string | null
}

const STATE_DOT = {
  open: 'bg-gray-300',
  drift: 'bg-orange-400',
  confirmed: 'bg-green-500',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ManagerDashboardPage() {
  const { user } = useAuthStore()
  const { skills, fetchSkillCatalog } = useSkillsStore()

  const [reports, setReports] = useState<Profile[]>([])
  const [allRatings, setAllRatings] = useState<SkillRating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSkillCatalog()
  }, [fetchSkillCatalog])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id)
        .order('full_name')

      const reportProfiles = (profiles ?? []) as Profile[]
      let ratings: SkillRating[] = []
      if (reportProfiles.length > 0) {
        const { data } = await supabase
          .from('skill_ratings')
          .select('*')
          .in(
            'user_id',
            reportProfiles.map((p) => p.id),
          )
        ratings = (data ?? []) as SkillRating[]
      }

      if (!cancelled) {
        setReports(reportProfiles)
        setAllRatings(ratings)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const rows = useMemo<ReportRow[]>(() => {
    return reports.map((profile) => {
      const ratings = allRatings.filter((r) => r.user_id === profile.id)
      const counts = emptyCounts()
      let lastConfirmedAt: string | null = null
      // Wir iterieren über den Skill-Katalog, damit auch fehlende Ratings als "open" zählen.
      for (const skill of skills) {
        const rating = ratings.find((r) => r.skill_id === skill._id)
        addToCounts(counts, getConfirmationState(rating))
        if (rating?.confirmed_at) {
          if (!lastConfirmedAt || rating.confirmed_at > lastConfirmedAt) {
            lastConfirmedAt = rating.confirmed_at
          }
        }
      }
      return { profile, counts, lastConfirmedAt }
    })
  }, [reports, allRatings, skills])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mein Team</h1>
        <p className="text-sm text-gray-500 mb-6">
          Hier siehst du den Bestätigungs-Stand deiner direkten Berichte.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-600">
            Du hast aktuell keine direkten Berichte zugewiesen.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Admins weisen Manager:innen unter <Link to="/admin" className="text-blue-600 hover:underline">/admin</Link> zu.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mein Team</h1>
      <p className="text-sm text-gray-500 mb-6">
        {reports.length} {reports.length === 1 ? 'Person' : 'Personen'} berichten an dich.
        Klick auf eine Karte, um Skills zu bestätigen.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ profile, counts, lastConfirmedAt }) => {
          const pending = counts.open + counts.drift
          return (
            <Link
              key={profile.id}
              to={`/team/${profile.id}`}
              className="group block rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-400 hover:shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-gray-900 truncate">
                    {profile.full_name || profile.email}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{profile.email}</div>
                </div>
                {pending > 0 && (
                  <span className="ml-2 shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                    {pending} offen
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat label="Offen" value={counts.open} dot={STATE_DOT.open} />
                <Stat label="Drift" value={counts.drift} dot={STATE_DOT.drift} />
                <Stat label="Bestätigt" value={counts.confirmed} dot={STATE_DOT.confirmed} />
              </div>

              <div className="text-xs text-gray-500">
                Letzte Bestätigung: {formatDate(lastConfirmedAt)}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-md bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block size-[8px] rounded-full ${dot}`} />
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-semibold text-gray-900 tabular-nums">{value}</div>
    </div>
  )
}
