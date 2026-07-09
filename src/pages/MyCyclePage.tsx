import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuthStore } from '@/store/auth'
import { useCyclesStore, pickRelevantCycle } from '@/store/cycles'
import { useGoalsStore } from '@/store/goals'
import { useSkillsStore } from '@/store/skills'
import type {
  DevelopmentCycle,
  DevelopmentGoal,
  GoalStatus,
  SkillLevel,
} from '@/types/database'
import { SkillStepper } from '@/components/SkillStepper'

const GOAL_TARGET_MIN = 3
const GOAL_TARGET_MAX = 5

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

function daysUntil(iso: string) {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = target.getTime() - today.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function MyCyclePage() {
  const { user } = useAuthStore()
  const { cycles, fetchCycles } = useCyclesStore()
  const { skills, fetchSkillCatalog } = useSkillsStore()
  const { myGoals, fetchMyGoals, createGoal, updateGoal, deleteGoal } =
    useGoalsStore()

  useEffect(() => {
    fetchCycles()
    fetchSkillCatalog()
  }, [fetchCycles, fetchSkillCatalog])

  const cycle = useMemo(() => pickRelevantCycle(cycles), [cycles])

  useEffect(() => {
    if (user && cycle) fetchMyGoals(user.id, cycle.id)
  }, [user, cycle, fetchMyGoals])

  if (!cycle) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Mein Cycle</h1>
        <p className="text-sm text-gray-500">
          Es ist aktuell kein Development-Cycle verfügbar. Frag deine:n Admin
          danach.
        </p>
      </div>
    )
  }

  return (
    <div>
      <CycleHeader cycle={cycle} />
      <GoalsSection cycle={cycle} goals={myGoals} skills={skills} userId={user?.id ?? ''}
        createGoal={createGoal} updateGoal={updateGoal} deleteGoal={deleteGoal}
      />
    </div>
  )
}

function CycleHeader({ cycle }: { cycle: DevelopmentCycle }) {
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
            <span className="ml-1 text-gray-500">bis Cycle-Ende</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface GoalsSectionProps {
  cycle: DevelopmentCycle
  goals: DevelopmentGoal[]
  skills: ReturnType<typeof useSkillsStore.getState>['skills']
  userId: string
  createGoal: ReturnType<typeof useGoalsStore.getState>['createGoal']
  updateGoal: ReturnType<typeof useGoalsStore.getState>['updateGoal']
  deleteGoal: ReturnType<typeof useGoalsStore.getState>['deleteGoal']
}

function GoalsSection({
  cycle,
  goals,
  skills,
  userId,
  createGoal,
  updateGoal,
  deleteGoal,
}: GoalsSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const editable = cycle.status !== 'closed'

  const skillsById = useMemo(
    () => Object.fromEntries(skills.map((s) => [s._id, s])),
    [skills],
  )

  const usedSkillIds = new Set(goals.map((g) => g.skill_id).filter(Boolean) as string[])
  const remainingTo3 = Math.max(0, GOAL_TARGET_MIN - goals.length)

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Deine Fokus-Skills</h2>
          <p className="text-sm text-gray-500">
            {goals.length} von {GOAL_TARGET_MIN}-{GOAL_TARGET_MAX} Zielen gesetzt
            {remainingTo3 > 0 && ` (mindestens ${remainingTo3} fehlen noch)`}
          </p>
        </div>
        {editable && goals.length < GOAL_TARGET_MAX && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Goal hinzufügen
          </button>
        )}
      </div>

      {showForm && (
        <NewGoalForm
          cycleId={cycle.id}
          userId={userId}
          allSkills={skills}
          excludeSkillIds={usedSkillIds}
          onCreated={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
          createGoal={createGoal}
        />
      )}

      {goals.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-600">
            Noch keine Fokus-Goals für diesen Cycle.
          </p>
          {editable && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-blue-700 hover:underline"
            >
              Erstes Goal anlegen →
            </button>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            skillTitle={
              goal.skill_id ? skillsById[goal.skill_id]?.title ?? 'Unbekannter Skill' : 'Team-Skill'
            }
            editable={editable}
            updateGoal={updateGoal}
            deleteGoal={deleteGoal}
          />
        ))}
      </ul>
    </section>
  )
}

interface NewGoalFormProps {
  cycleId: string
  userId: string
  allSkills: ReturnType<typeof useSkillsStore.getState>['skills']
  excludeSkillIds: Set<string>
  onCreated: () => void
  onCancel: () => void
  createGoal: ReturnType<typeof useGoalsStore.getState>['createGoal']
}

function NewGoalForm({
  cycleId,
  userId,
  allSkills,
  excludeSkillIds,
  onCreated,
  onCancel,
  createGoal,
}: NewGoalFormProps) {
  const [skillId, setSkillId] = useState('')
  const [targetLevel, setTargetLevel] = useState<SkillLevel>(3)
  const [currentState, setCurrentState] = useState('')
  const [plan, setPlan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableSkills = allSkills.filter((s) => !excludeSkillIds.has(s._id))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!skillId) {
      setError('Bitte einen Skill wählen')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await createGoal({
        cycle_id: cycleId,
        user_id: userId,
        skill_id: skillId,
        target_level: targetLevel,
        current_state_text: currentState.trim() || null,
        learning_plan_text: plan.trim() || null,
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
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Neues Goal</h3>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">Skill</label>
        <select
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">— Skill wählen —</option>
          {availableSkills.map((s) => (
            <option key={s._id} value={s._id}>
              {s.categoryTitle ? `${s.categoryTitle} · ` : ''}
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Ziel-Level
        </label>
        <SkillStepper value={targetLevel} onChange={setTargetLevel} />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Was kann ich heute? (Ist-Zustand)
        </label>
        <textarea
          rows={2}
          value={currentState}
          onChange={(e) => setCurrentState(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Wie will ich es erreichen? (Lernplan)
        </label>
        <textarea
          rows={3}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
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
          Speichern
        </button>
      </div>
    </form>
  )
}

interface GoalCardProps {
  goal: DevelopmentGoal
  skillTitle: string
  editable: boolean
  updateGoal: ReturnType<typeof useGoalsStore.getState>['updateGoal']
  deleteGoal: ReturnType<typeof useGoalsStore.getState>['deleteGoal']
}

function GoalCard({
  goal,
  skillTitle,
  editable,
  updateGoal,
  deleteGoal,
}: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [achievement, setAchievement] = useState(goal.achievement_text ?? '')
  const [savingNote, setSavingNote] = useState(false)

  const isApproved = goal.approved_by !== null
  const lockedByApproval = isApproved

  async function handleStatusChange(status: GoalStatus) {
    await updateGoal(goal.id, { status })
  }

  async function saveAchievement() {
    setSavingNote(true)
    try {
      await updateGoal(goal.id, { achievement_text: achievement.trim() || null })
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                STATUS_COLOR[goal.status]
              }`}
            >
              {STATUS_LABEL[goal.status]}
            </span>
            <span className="truncate text-sm font-semibold text-gray-900">
              {skillTitle}
            </span>
            {isApproved && (
              <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                Bestätigt
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            Ziel-Level {goal.target_level}
          </p>
        </div>
        <span className="text-xs text-gray-400">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 text-sm">
          {goal.current_state_text && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Was kann ich heute?
              </div>
              <p className="mt-1 whitespace-pre-line text-gray-800">
                {goal.current_state_text}
              </p>
            </div>
          )}
          {goal.learning_plan_text && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Lernplan
              </div>
              <p className="mt-1 whitespace-pre-line text-gray-800">
                {goal.learning_plan_text}
              </p>
            </div>
          )}
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Was habe ich erreicht?
            </div>
            <textarea
              rows={3}
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              disabled={!editable || lockedByApproval}
              placeholder={editable ? 'Notiere deinen Fortschritt…' : 'Cycle ist geschlossen'}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            />
            {editable && !lockedByApproval && (
              <button
                type="button"
                onClick={saveAchievement}
                disabled={savingNote}
                className="mt-2 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {savingNote ? 'Speichere…' : 'Fortschritt speichern'}
              </button>
            )}
          </div>

          {editable && !lockedByApproval && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Eigener Status:</span>
                {(['planned', 'in_progress'] as GoalStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
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
              <button
                type="button"
                onClick={() => {
                  if (confirm('Goal wirklich löschen?')) deleteGoal(goal.id)
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Löschen
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
