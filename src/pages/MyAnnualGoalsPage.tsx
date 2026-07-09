import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuthStore } from '@/store/auth'
import { useCyclesStore, pickRelevantCycle } from '@/store/cycles'
import { useAnnualGoalsStore } from '@/store/annualGoals'
import { useSkillsStore } from '@/store/skills'
import type {
  AnnualGoal,
  CheckinConfidence,
  DevelopmentCycle,
  GoalStatus,
} from '@/types/database'

const MAX_GOALS = 3

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

const CONFIDENCE_LABEL: Record<CheckinConfidence, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
}

const CONFIDENCE_DOT: Record<CheckinConfidence, string> = {
  on_track: 'bg-green-500',
  at_risk: 'bg-orange-400',
}

function daysUntil(iso: string) {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function MyAnnualGoalsPage() {
  const { user } = useAuthStore()
  const { cycles, fetchCycles } = useCyclesStore()
  const { skills, fetchSkillCatalog } = useSkillsStore()
  const {
    myGoals,
    checkinsByGoal,
    linkedQuarterGoals,
    fetchMyGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    fetchCheckins,
    addCheckin,
    fetchLinkedQuarterGoals,
  } = useAnnualGoalsStore()

  useEffect(() => {
    fetchCycles()
    fetchSkillCatalog()
  }, [fetchCycles, fetchSkillCatalog])

  const cycle = useMemo(
    () => pickRelevantCycle(cycles.filter((c) => c.cycle_type === 'annual')),
    [cycles],
  )

  useEffect(() => {
    if (user && cycle) fetchMyGoals(user.id, cycle.id)
  }, [user, cycle, fetchMyGoals])

  const goalIds = useMemo(() => myGoals.map((g) => g.id), [myGoals])
  const goalIdsKey = goalIds.join(',')
  useEffect(() => {
    if (goalIds.length > 0) {
      fetchCheckins(goalIds)
      fetchLinkedQuarterGoals(goalIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalIdsKey, fetchCheckins, fetchLinkedQuarterGoals])

  if (!cycle) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Jahresziele</h1>
        <p className="text-sm text-gray-500">
          Es ist aktuell kein Jahres-Cycle verfügbar. Frag deine:n Admin danach —
          Jahres-Cycles werden unter Admin → Cycles mit Typ «Jahr» angelegt.
        </p>
      </div>
    )
  }

  const editable = cycle.status !== 'closed'

  return (
    <div>
      <AnnualCycleHeader cycle={cycle} />
      <GoalsSection
        cycle={cycle}
        goals={myGoals}
        userId={user?.id ?? ''}
        editable={editable}
        skills={skills}
        checkinsByGoal={checkinsByGoal}
        linkedQuarterGoals={linkedQuarterGoals}
        createGoal={createGoal}
        updateGoal={updateGoal}
        deleteGoal={deleteGoal}
        addCheckin={addCheckin}
      />
    </div>
  )
}

function AnnualCycleHeader({ cycle }: { cycle: DevelopmentCycle }) {
  const remainingDays = daysUntil(cycle.end_date)
  const statusLabel =
    cycle.status === 'active' ? 'Aktiv'
    : cycle.status === 'upcoming' ? 'Geplant'
    : 'Geschlossen'
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {statusLabel}
            </span>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
              Jahres-Cycle
            </span>
            <h1 className="text-xl font-semibold text-gray-900">{cycle.name}</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(cycle.start_date)} – {formatDate(cycle.end_date)}
          </p>
        </div>
        {cycle.status === 'active' && (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="font-semibold text-gray-900">
              {remainingDays > 0 ? `Noch ${remainingDays} Tage` : 'Endet heute / vorbei'}
            </span>
            <span className="ml-1 text-gray-500">bis zum Jahresgespräch</span>
          </div>
        )}
      </div>
    </div>
  )
}

type SkillsList = ReturnType<typeof useSkillsStore.getState>['skills']
type Store = ReturnType<typeof useAnnualGoalsStore.getState>

interface GoalsSectionProps {
  cycle: DevelopmentCycle
  goals: AnnualGoal[]
  userId: string
  editable: boolean
  skills: SkillsList
  checkinsByGoal: Store['checkinsByGoal']
  linkedQuarterGoals: Store['linkedQuarterGoals']
  createGoal: Store['createGoal']
  updateGoal: Store['updateGoal']
  deleteGoal: Store['deleteGoal']
  addCheckin: Store['addCheckin']
}

function GoalsSection({
  cycle,
  goals,
  userId,
  editable,
  skills,
  checkinsByGoal,
  linkedQuarterGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addCheckin,
}: GoalsSectionProps) {
  const [showForm, setShowForm] = useState(false)

  const skillsById = useMemo(
    () => Object.fromEntries(skills.map((s) => [s._id, s])),
    [skills],
  )

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Deine Jahresziele</h2>
          <p className="text-sm text-gray-500">
            {goals.length} von max. {MAX_GOALS} Zielen — Konzentration: wenige
            wesentliche Ziele, sauber zu Ende gebracht.
          </p>
        </div>
        {editable && goals.length < MAX_GOALS && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Ziel hinzufügen
          </button>
        )}
      </div>

      {showForm && (
        <NewAnnualGoalForm
          cycle={cycle}
          userId={userId}
          skills={skills}
          onCreated={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
          createGoal={createGoal}
        />
      )}

      {goals.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-600">
            Noch keine Jahresziele für {cycle.name}.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Ziele werden gemeinsam mit deinem/deiner Manager:in vereinbart —
            lege hier einen Entwurf fürs Gespräch an.
          </p>
          {editable && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-blue-700 hover:underline"
            >
              Ersten Entwurf anlegen →
            </button>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {goals.map((goal) => (
          <AnnualGoalCard
            key={goal.id}
            goal={goal}
            userId={userId}
            editable={editable}
            skillTitle={
              goal.skill_id
                ? (skillsById[goal.skill_id]?.title ?? 'Unbekannter Skill')
                : goal.team_skill_id
                  ? 'Team-Skill'
                  : null
            }
            checkins={checkinsByGoal[goal.id] ?? []}
            quarterGoals={linkedQuarterGoals[goal.id] ?? []}
            skillsById={skillsById}
            updateGoal={updateGoal}
            deleteGoal={deleteGoal}
            addCheckin={addCheckin}
          />
        ))}
      </ul>
    </section>
  )
}

interface NewAnnualGoalFormProps {
  cycle: DevelopmentCycle
  userId: string
  skills: SkillsList
  onCreated: () => void
  onCancel: () => void
  createGoal: Store['createGoal']
}

function NewAnnualGoalForm({
  cycle,
  userId,
  skills,
  onCreated,
  onCancel,
  createGoal,
}: NewAnnualGoalFormProps) {
  const [title, setTitle] = useState('')
  const [criteria, setCriteria] = useState('')
  const [dueDate, setDueDate] = useState(cycle.end_date)
  const [skillId, setSkillId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Malik: schriftlich, präzise, messbar, terminiert — alles Pflicht.
    if (!title.trim()) {
      setError('Bitte ein präzises Ziel formulieren')
      return
    }
    if (!criteria.trim()) {
      setError('Bitte das messbare Ergebnis definieren — woran erkennen wir, dass das Ziel erreicht ist?')
      return
    }
    if (!dueDate) {
      setError('Bitte eine Frist setzen')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await createGoal({
        user_id: userId,
        cycle_id: cycle.id,
        title: title.trim(),
        success_criteria: criteria.trim(),
        due_date: dueDate,
        skill_id: skillId || null,
      })
      if (!created) {
        setError('Speichern fehlgeschlagen — siehe Console')
        return
      }
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-gray-200 bg-white p-5"
    >
      <h3 className="text-sm font-semibold text-gray-900">Neues Jahresziel (Entwurf)</h3>
      <p className="mb-3 mt-0.5 text-xs text-gray-500">
        Wird erst verbindlich, wenn dein:e Manager:in es im Gespräch bestätigt.
      </p>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Ziel (präzise formuliert) *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Design-System-Ownership übernehmen"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Messbares Ergebnis — woran erkennen wir Erfolg? *
        </label>
        <textarea
          rows={2}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="z.B. DS v2 ist live, 3 Teams arbeiten damit"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Frist *</label>
          <input
            type="date"
            value={dueDate}
            min={cycle.start_date}
            max={cycle.end_date}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Stärken-Anker (optional) — baut das Ziel auf einer vorhandenen Stärke auf?
          </label>
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Kein Skill-Bezug —</option>
            {skills.map((s) => (
              <option key={s._id} value={s._id}>
                {s.categoryTitle ? `${s.categoryTitle} · ` : ''}
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Entwurf speichern
        </button>
      </div>
    </form>
  )
}

interface AnnualGoalCardProps {
  goal: AnnualGoal
  userId: string
  editable: boolean
  skillTitle: string | null
  checkins: Store['checkinsByGoal'][string]
  quarterGoals: Store['linkedQuarterGoals'][string]
  skillsById: Record<string, SkillsList[number]>
  updateGoal: Store['updateGoal']
  deleteGoal: Store['deleteGoal']
  addCheckin: Store['addCheckin']
}

function AnnualGoalCard({
  goal,
  userId,
  editable,
  skillTitle,
  checkins,
  quarterGoals,
  skillsById,
  updateGoal,
  deleteGoal,
  addCheckin,
}: AnnualGoalCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isAgreed = goal.agreement_status === 'agreed'
  const isApproved = goal.approved_by !== null
  const latestConfidence = checkins[0]?.confidence ?? null
  const dueInDays = daysUntil(goal.due_date)
  const achievedQuarterGoals = quarterGoals.filter((g) => g.status === 'achieved').length

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50"
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
            {latestConfidence && !isApproved && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <span className={`size-[8px] rounded-full ${CONFIDENCE_DOT[latestConfidence]}`} />
                {CONFIDENCE_LABEL[latestConfidence]}
              </span>
            )}
            {isApproved && (
              <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                Abgenommen
              </span>
            )}
            <span className="truncate text-sm font-semibold text-gray-900">
              {goal.title}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            Frist {formatDate(goal.due_date)}
            {dueInDays > 0 && !isApproved && ` · noch ${dueInDays} Tage`}
            {skillTitle && ` · Stärken-Anker: ${skillTitle}`}
          </p>
        </div>
        <span className="text-xs text-gray-400">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-gray-100 px-5 py-4 text-sm">
          <AgreementSection goal={goal} editable={editable && !isApproved} updateGoal={updateGoal} />

          {quarterGoals.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Zahlt ein aus Quartals-Goals ({achievedQuarterGoals}/{quarterGoals.length} erreicht)
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {quarterGoals.map((qg) => (
                  <li
                    key={qg.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      qg.status === 'achieved'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    {qg.status === 'achieved' ? '✓' : '·'}{' '}
                    {qg.skill_id
                      ? (skillsById[qg.skill_id]?.title ?? 'Skill')
                      : 'Team-Skill'}{' '}
                    → Level {qg.target_level}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAgreed && (
            <CheckinsSection
              goal={goal}
              userId={userId}
              checkins={checkins}
              editable={editable && !isApproved}
              addCheckin={addCheckin}
            />
          )}

          <ReviewSection goal={goal} editable={editable} updateGoal={updateGoal} />

          {editable && !isApproved && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Eigener Status:</span>
                {(['planned', 'in_progress'] as GoalStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateGoal(goal.id, { status: s })}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      goal.status === s
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {!isAgreed && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Entwurf wirklich löschen?')) deleteGoal(goal.id)
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Löschen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function AgreementSection({
  goal,
  editable,
  updateGoal,
}: {
  goal: AnnualGoal
  editable: boolean
  updateGoal: Store['updateGoal']
}) {
  const isAgreed = goal.agreement_status === 'agreed'
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(goal.title)
  const [criteria, setCriteria] = useState(goal.success_criteria)
  const [dueDate, setDueDate] = useState(goal.due_date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim() || !criteria.trim() || !dueDate) {
      setError('Zieltext, Ergebnis und Frist sind Pflicht')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const err = await updateGoal(goal.id, {
        title: title.trim(),
        success_criteria: criteria.trim(),
        due_date: dueDate,
      })
      if (err) {
        setError(err)
        return
      }
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Vereinbarung
        </div>
        {isAgreed ? (
          <span className="text-[11px] text-gray-400">
            Vereinbart am {goal.agreed_at ? formatDate(goal.agreed_at) : '—'} · gesperrt
            — Änderung nur via Neuverhandlung
          </span>
        ) : (
          editable &&
          !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-blue-700 hover:underline"
            >
              Entwurf bearbeiten
            </button>
          )
        )}
      </div>

      {!editing && (
        <div className="mt-1.5 space-y-2">
          <p className="whitespace-pre-line text-gray-800">{goal.title}</p>
          <div>
            <span className="text-xs text-gray-500">Messbares Ergebnis: </span>
            <span className="whitespace-pre-line text-gray-800">
              {goal.success_criteria}
            </span>
          </div>
        </div>
      )}

      {editing && (
        <div className="mt-2 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            rows={2}
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckinsSection({
  goal,
  userId,
  checkins,
  editable,
  addCheckin,
}: {
  goal: AnnualGoal
  userId: string
  checkins: Store['checkinsByGoal'][string]
  editable: boolean
  addCheckin: Store['addCheckin']
}) {
  const [note, setNote] = useState('')
  const [confidence, setConfidence] = useState<CheckinConfidence>('on_track')
  const [nextStep, setNextStep] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!note.trim()) {
      setError('Bitte kurz notieren, wo du stehst')
      return
    }
    if (confidence === 'at_risk' && !nextStep.trim()) {
      // Malik: konstruktiv — nicht beim Problem stehen bleiben.
      setError('At Risk: Was tun wir jetzt? Bitte den nächsten Schritt festhalten')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const ok = await addCheckin({
        goal_id: goal.id,
        author_id: userId,
        note: note.trim(),
        confidence,
        next_step: nextStep.trim() || null,
      })
      if (!ok) {
        setError('Speichern fehlgeschlagen — siehe Console')
        return
      }
      setNote('')
      setNextStep('')
      setConfidence('on_track')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Check-ins
      </div>

      {editable && (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Wo stehst du? Was hat sich bewegt?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(['on_track', 'at_risk'] as CheckinConfidence[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConfidence(c)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  confidence === c
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-white'
                }`}
              >
                <span className={`size-[8px] rounded-full ${CONFIDENCE_DOT[c]}`} />
                {CONFIDENCE_LABEL[c]}
              </button>
            ))}
          </div>
          {confidence === 'at_risk' && (
            <input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="Nächster Schritt — was tun wir jetzt?"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Speichere…' : 'Check-in speichern'}
          </button>
        </div>
      )}

      {checkins.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">Noch keine Check-ins.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {checkins.map((c) => (
            <li key={c.id} className="rounded-md border border-gray-100 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className={`size-[8px] rounded-full ${CONFIDENCE_DOT[c.confidence]}`} />
                {CONFIDENCE_LABEL[c.confidence]} · {formatDate(c.created_at)}
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
      )}
    </div>
  )
}

function ReviewSection({
  goal,
  editable,
  updateGoal,
}: {
  goal: AnnualGoal
  editable: boolean
  updateGoal: Store['updateGoal']
}) {
  const isApproved = goal.approved_by !== null
  const [achievement, setAchievement] = useState(goal.achievement_text ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateGoal(goal.id, { achievement_text: achievement.trim() || null })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Jahresgespräch
      </div>

      <div className="mt-1.5">
        <div className="text-xs text-gray-500">
          Was wurde erreicht? (gemessen am vereinbarten Ergebnis)
        </div>
        <textarea
          rows={3}
          value={achievement}
          onChange={(e) => setAchievement(e.target.value)}
          disabled={!editable || isApproved}
          placeholder="Resultate, nicht Aktivitäten — was ist konkret entstanden?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
        {editable && !isApproved && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-1.5 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Speichere…' : 'Speichern'}
          </button>
        )}
      </div>

      {(goal.manager_assessment_text || goal.conclusion_text || isApproved) && (
        <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3">
          {goal.manager_assessment_text && (
            <div>
              <div className="text-xs text-gray-500">Manager-Einschätzung</div>
              <p className="mt-0.5 whitespace-pre-line text-gray-800">
                {goal.manager_assessment_text}
              </p>
            </div>
          )}
          {goal.conclusion_text && (
            <div>
              <div className="text-xs text-gray-500">Gemeinsames Fazit</div>
              <p className="mt-0.5 whitespace-pre-line text-gray-800">
                {goal.conclusion_text}
              </p>
            </div>
          )}
          {isApproved && (
            <p className="text-[11px] text-gray-400">
              Abgenommen am {goal.approved_at ? formatDate(goal.approved_at) : '—'} —
              finaler Status: {STATUS_LABEL[goal.status]}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
