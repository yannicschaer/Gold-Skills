import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCyclesStore } from '@/store/cycles'
import type { CycleStatus, DevelopmentCycle } from '@/types/database'

const STATUS_LABEL: Record<CycleStatus, string> = {
  upcoming: 'Geplant',
  active: 'Aktiv',
  closed: 'Geschlossen',
}

const STATUS_COLOR: Record<CycleStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function AdminCyclesPage() {
  const { cycles, loading, fetchCycles, createCycle, updateCycle, deleteCycle } =
    useCyclesStore()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !startDate || !endDate) {
      setError('Name, Start- und End-Datum sind Pflicht')
      return
    }
    if (endDate < startDate) {
      setError('End-Datum muss nach dem Start-Datum liegen')
      return
    }
    setSubmitting(true)
    try {
      const created = await createCycle({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      })
      if (!created) {
        setError('Erstellung fehlgeschlagen — siehe Console')
        return
      }
      setName('')
      setStartDate('')
      setEndDate('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(cycle: DevelopmentCycle, status: CycleStatus) {
    if (status === cycle.status) return
    if (status === 'active') {
      // Sicherheit: maximal 1 aktiver Cycle gleichzeitig sinnvoll
      const otherActive = cycles.find(
        (c) => c.id !== cycle.id && c.status === 'active',
      )
      if (
        otherActive &&
        !confirm(
          `"${otherActive.name}" ist bereits aktiv. Trotzdem fortfahren? Du solltest den anderen Cycle vorher schließen.`,
        )
      ) {
        return
      }
    }
    if (status === 'closed' && !confirm(`Cycle "${cycle.name}" wirklich schliessen?`)) {
      return
    }
    await updateCycle(cycle.id, { status })
  }

  async function handleDelete(cycle: DevelopmentCycle) {
    if (
      !confirm(
        `Cycle "${cycle.name}" inkl. aller Goals löschen? Das ist nicht rückgängig zu machen.`,
      )
    ) {
      return
    }
    await deleteCycle(cycle.id)
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/admin" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Zurück zu Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Development Cycles</h1>
        <p className="text-sm text-gray-500">
          Trimestrale Entwicklungs-Zyklen verwalten. Pro Cycle setzen Mitarbeitende
          3-5 Fokus-Goals; Manager bestätigen am Ende.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Neuen Cycle anlegen
        </h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Frühling 2026"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ende
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Zeitraum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && cycles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  Lade Cycles…
                </td>
              </tr>
            )}
            {!loading && cycles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  Noch keine Cycles. Lege oben den ersten an.
                </td>
              </tr>
            )}
            {cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {cycle.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {formatDate(cycle.start_date)} – {formatDate(cycle.end_date)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLOR[cycle.status]
                    }`}
                  >
                    {STATUS_LABEL[cycle.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    {cycle.status !== 'active' && cycle.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(cycle, 'active')}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Aktivieren
                      </button>
                    )}
                    {cycle.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(cycle, 'closed')}
                        className="text-xs text-gray-700 hover:underline"
                      >
                        Schliessen
                      </button>
                    )}
                    {cycle.status === 'closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(cycle, 'active')}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        Wiedereröffnen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(cycle)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
