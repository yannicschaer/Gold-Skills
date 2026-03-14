import { useEffect, useState, type FormEvent } from 'react'
import { useAdminStore } from '@/store/admin'
import { useAuthStore } from '@/store/auth'

export function AdminPage() {
  const { user } = useAuthStore()
  const {
    members,
    loading,
    fetchMembers,
    inviteMember,
    changeRole,
    deactivateMember,
    reactivateMember,
    removeMember,
  } = useAdminStore()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteSuccess(null)
    setActionError(null)
    try {
      await inviteMember(inviteEmail)
      setInviteSuccess(`Einladung an ${inviteEmail} gesendet`)
      setInviteEmail('')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Einladung fehlgeschlagen',
      )
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRoleChange(
    userId: string,
    newRole: 'admin' | 'designer' | 'operations',
  ) {
    setActionError(null)
    try {
      await changeRole(userId, newRole)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Rollenänderung fehlgeschlagen',
      )
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setActionError(null)
    try {
      if (isActive) {
        await deactivateMember(userId)
      } else {
        await reactivateMember(userId)
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Aktion fehlgeschlagen',
      )
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Mitglied endgültig entfernen? Alle Skill-Daten gehen verloren.'))
      return
    setActionError(null)
    try {
      await removeMember(userId)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Entfernung fehlgeschlagen',
      )
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Mitglieder verwalten
      </h1>

      {/* Invite Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Neues Mitglied einladen
        </h2>
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1">
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              E-Mail-Adresse
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@beispiel.de"
              className="block w-full rounded-md border-gray-300 shadow-sm
                         focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={inviteLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm
                       text-sm font-medium text-white bg-blue-600
                       hover:bg-blue-700 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {inviteLoading ? 'Sende...' : 'Einladen'}
          </button>
        </form>
        {inviteSuccess && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {inviteSuccess}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {actionError}
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                E-Mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">
                Rolle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-48">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => {
              const isSelf = member.id === user?.id

              return (
                <tr
                  key={member.id}
                  className={!member.is_active ? 'opacity-60' : ''}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {member.full_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as 'admin' | 'designer' | 'operations',
                        )
                      }
                      disabled={isSelf}
                      className="block w-full rounded-md border-gray-300 shadow-sm text-sm
                                 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="designer">Designer</option>
                      <option value="operations">Operations</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {member.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!isSelf && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            handleToggleActive(member.id, member.is_active)
                          }
                          className={`text-xs px-3 py-1 rounded font-medium ${
                            member.is_active
                              ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                              : 'text-green-700 bg-green-100 hover:bg-green-200'
                          }`}
                        >
                          {member.is_active ? 'Deaktivieren' : 'Reaktivieren'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-xs px-3 py-1 rounded font-medium
                                     text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          Entfernen
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
