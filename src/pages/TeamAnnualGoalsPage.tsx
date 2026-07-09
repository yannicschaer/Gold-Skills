import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useCyclesStore, pickRelevantCycle } from '@/store/cycles'
import { useAnnualGoalsStore } from '@/store/annualGoals'
import { supabase } from '@/lib/supabase'
import type {
  AnnualGoal,
  CheckinConfidence,
  GoalStatus,
  Profile,
} from '@/types/database'

const STATUS_LABEL: Record<GoalStatus, string> = {
  planned: 'Geplant',
  in_progress: 'Läuft',
  achieved: 'Erreicht',
  partially_achieved: 'Teilweise erreicht',
  missed: 'Nicht erreicht',
}

const STATUS_COLOR: Record<GoalStatus, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  achieved: 'bg-green-100 text-green-800',
  partially_achieved: 'bg-amber-100 text-amber-800',
  missed: 'bg-red-100 text-red-700',
}

const CONFIDENCE_DOT: Record<CheckinConfidence, string> = {
  on_track: 'bg-green-500',
  at_risk: 'bg-orange-400',
}

const FINAL_STATUSES: Array<Extract<GoalStatus, 'achieved' | 'partially_achieved' | 'missed'>> = [
  'achieved',
  'partially_achieved',
  'missed',
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TeamAnnualGoalsPage() {
  const { user } = useAuthStore()
  const { cycles, fetchCycles } = useCyclesStore()
  const {
    teamGoals,
    checkinsByGoal,
    fetchTeamGoals,
    fetchCheckins,
    agreeGoal,
    renegotiateGoal,
    approveGoal,
  } = useAnnualGoalsStore()

  const [reports, setReports] = useState<Profile[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  const cycle = useMemo(
    () => pickRelevantCycle(cycles.filter((c) => c.cycle_type === 'annual')),
    [cycles],
  )

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id)
        .order('full_name')
      if (!cancelled) {
        setReports((data ?? []) as Profile[])
        setLoadingReports(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (cycle && reports.length > 0) {
      fetchTeamGoals(
        cycle.id,
        reports.map((r) => r.id),
      )
    }
  }, [cycle, reports, fetchTeamGoals])

  const teamGoalIdsKey = teamGoals.map((g) => g.id).join(',')
  useEffect(() => {
    if (teamGoals.length > 0) fetchCheckins(teamGoals.map((g) => g.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamGoalIdsKey, fetchCheckins])

  if (!cycle) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Team-Jahresziele</h1>
        <p className="text-sm text-gray-500">
          Es ist aktuell kein Jahres-Cycle verfügbar. Admins legen ihn unter{' '}
          <Link to="/admin/cycles" className="text-blue-600 hover:underline">
            Admin → Cycles
          </Link>{' '}
          mit Typ «Jahr» an.
        </p>
      </div>
    )
  }

  if (!loadingReports && reports.length === 0) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Team-Jahresziele</h1>
        <p className="text-sm text-gray-500">
          Du hast aktuell keine direkten Berichte zugewiesen.
        </p>
      </div>
    )
  }

  const draftsCount = teamGoals.filter((g) => g.agreement_status === 'draft').length

  return (
    <div>
      <div className="mb-6">
        <Link to="/manager" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Zurück zu Mein Team
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Team-Jahresziele</h1>
        <p className="text-sm text-gray-500">
          {cycle.name} · {formatDate(cycle.start_date)} – {formatDate(cycle.end_date)}
          {draftsCount > 0 && (
            <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
              {draftsCount} {draftsCount === 1 ? 'Entwurf wartet' : 'Entwürfe warten'} auf Vereinbarung
            </span>
          )}
        </p>
      </div>

      <div className="space-y-6">
        {reports.map((report) => (
          <ReportSection
            key={report.id}
            report={report}
            goals={teamGoals.filter((g) => g.user_id === report.id)}
            checkinsByGoal={checkinsByGoal}
            approverId={user?.id ?? ''}
            agreeGoal={agreeGoal}
            renegotiateGoal={renegotiateGoal}
            approveGoal={approveGoal}
          />
        ))}
      </div>
    </div>
  )
}

type Store = ReturnType<typeof useAnnualGoalsStore.getState>

function ReportSection({
  report,
  goals,
  checkinsByGoal,
  approverId,
  agreeGoal,
  renegotiateGoal,
  approveGoal,
}: {
  report: Profile
  goals: AnnualGoal[]
  checkinsByGoal: Store['checkinsByGoal']
  approverId: string
  agreeGoal: Store['agreeGoal']
  renegotiateGoal: Store['renegotiateGoal']
  approveGoal: Store['approveGoal']
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div>
          <span className="text-sm font-semibold text-gray-900">
            {report.full_name || report.email}
          </span>
          <span className="ml-2 text-xs text-gray-400">
            {goals.length} von max. 3 Zielen
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {goals.map((g) => {
            const latest = checkinsByGoal[g.id]?.[0]
            return (
              <span
                key={g.id}
                title={g.title}
                className={`inline-block size-[10px] rounded-full ${
                  g.approved_by
                    ? 'bg-green-500'
                    : g.agreement_status === 'draft'
                      ? 'bg-gray-300'
                      : latest
                        ? CONFIDENCE_DOT[latest.confidence]
                        : 'bg-blue-400'
                }`}
              />
            )
          })}
        </div>
      </div>

      {goals.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-400">
          Noch keine Jahresziele erfasst.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {goals.map((goal) => (
            <ManagerGoalRow
              key={goal.id}
              goal={goal}
              checkins={checkinsByGoal[goal.id] ?? []}
              approverId={approverId}
              agreeGoal={agreeGoal}
              renegotiateGoal={renegotiateGoal}
              approveGoal={approveGoal}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ManagerGoalRow({
  goal,
  checkins,
  approverId,
  agreeGoal,
  renegotiateGoal,
  approveGoal,
}: {
  goal: AnnualGoal
  checkins: Store['checkinsByGoal'][string]
  approverId: string
  agreeGoal: Store['agreeGoal']
  renegotiateGoal: Store['renegotiateGoal']
  approveGoal: Store['approveGoal']
}) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Review-Formular
  const [assessment, setAssessment] = useState(goal.manager_assessment_text ?? '')
  const [conclusion, setConclusion] = useState(goal.conclusion_text ?? '')
  const [finalStatus, setFinalStatus] = useState<(typeof FINAL_STATUSES)[number]>('achieved')

  const isAgreed = goal.agreement_status === 'agreed'
  const isApproved = goal.approved_by !== null

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    try {
      const err = await action()
      if (err) setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isAgreed ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isAgreed ? 'Vereinbart' : 'Entwurf'}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[goal.status]}`}
            >
              {STATUS_LABEL[goal.status]}
            </span>
            {isApproved && (
              <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                Abgenommen
              </span>
            )}
            <span className="truncate text-sm font-medium text-gray-900">
              {goal.title}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            Frist {formatDate(goal.due_date)}
          </p>
        </div>
        <span className="text-xs text-gray-400">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="space-y-4 bg-gray-50/50 px-5 py-4 text-sm">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Messbares Ergebnis
            </div>
            <p className="mt-1 whitespace-pre-line text-gray-800">
              {goal.success_criteria}
            </p>
          </div>

          {checkins.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Check-ins
              </div>
              <ul className="mt-1.5 space-y-1.5">
                {checkins.map((c) => (
                  <li key={c.id} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className={`size-[8px] rounded-full ${CONFIDENCE_DOT[c.confidence]}`} />
                      {formatDate(c.created_at)}
                    </div>
                    <p className="mt-0.5 whitespace-pre-line text-gray-800">{c.note}</p>
                    {c.next_step && (
                      <p className="mt-0.5 text-xs text-gray-600">
                        <span className="font-medium">Nächster Schritt:</span> {c.next_step}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {goal.achievement_text && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Selbsteinschätzung — was wurde erreicht?
              </div>
              <p className="mt-1 whitespace-pre-line text-gray-800">
                {goal.achievement_text}
              </p>
            </div>
          )}

          {/* Agreement-Aktionen */}
          {!isApproved && (
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
              {!isAgreed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => agreeGoal(goal.id))}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Als vereinbart bestätigen
                </button>
              )}
              {isAgreed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        'Neuverhandeln? Das Ziel geht zurück auf Entwurf und muss erneut vereinbart werden.',
                      )
                    ) {
                      run(() => renegotiateGoal(goal.id))
                    }
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                >
                  Neuverhandeln
                </button>
              )}
            </div>
          )}

          {/* Jahresgespräch: Beurteilung + Abnahme */}
          {isAgreed && !isApproved && (
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Jahresgespräch — Beurteilung &amp; Abnahme
              </div>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Manager-Einschätzung (gemessen am vereinbarten Ergebnis)
                  </label>
                  <textarea
                    rows={2}
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Gemeinsames Fazit
                  </label>
                  <textarea
                    rows={2}
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Finaler Status:</span>
                  {FINAL_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFinalStatus(s)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        finalStatus === s
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm('Ziel final abnehmen? Danach ist es gesperrt.')) {
                      run(() =>
                        approveGoal(
                          goal.id,
                          approverId,
                          finalStatus,
                          assessment.trim() || null,
                          conclusion.trim() || null,
                        ),
                      )
                    }
                  }}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Beurteilung speichern &amp; abnehmen
                </button>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">
              Abgenommen am {goal.approved_at ? formatDate(goal.approved_at) : '—'} —
              finaler Status: {STATUS_LABEL[goal.status]}
              {goal.manager_assessment_text && (
                <p className="mt-1 whitespace-pre-line">{goal.manager_assessment_text}</p>
              )}
              {goal.conclusion_text && (
                <p className="mt-1 whitespace-pre-line italic">{goal.conclusion_text}</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </li>
  )
}
