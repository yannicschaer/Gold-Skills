import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeamsStore } from '@/store/teams'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import {
  Plus,
  Trash,
  CaretUp,
  CaretDown,
  PencilSimple,
  Check,
  X,
  UserPlus,
} from '@phosphor-icons/react'

function InlineEditField({
  value,
  onSave,
  placeholder = '',
  className = '',
}: {
  value: string
  onSave: (val: string) => void
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setDraft(value)
          setEditing(true)
        }}
        className={`group flex items-center gap-[6px] ${className}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <PencilSimple
          size={14}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-neutral-400 transition-opacity"
        />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-[4px]" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`border border-sand-300 rounded-[4px] px-[6px] py-[2px] font-body text-forest-950 outline-none focus:border-mint-400 ${className}`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={commit}
        className="text-mint-500 hover:text-mint-600"
      >
        <Check size={16} weight="bold" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-neutral-400 hover:text-neutral-600"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}

export function TeamCatalogPage() {
  const { teamId } = useParams<{ teamId?: string }>()
  const navigate = useNavigate()

  const {
    teams,
    teamMembers,
    teamSkillGroups,
    teamSkills,
    loading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    fetchTeamMembers,
    addTeamMember,
    removeTeamMember,
    fetchSkillGroups,
    createSkillGroup,
    updateSkillGroup,
    deleteSkillGroup,
    reorderSkillGroups,
    fetchSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    reorderSkills,
  } = useTeamsStore()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newSkillNames, setNewSkillNames] = useState<Record<string, string>>({})
  const [showNewSkill, setShowNewSkill] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchTeams()
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setProfiles(data as Profile[])
      })
  }, [fetchTeams])

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers(teamId)
      fetchSkillGroups(teamId)
      fetchSkills(teamId)
    }
  }, [teamId, fetchTeamMembers, fetchSkillGroups, fetchSkills])

  const selectedTeam = teams.find((t) => t.id === teamId)

  const handleCreateTeam = async () => {
    const trimmed = newTeamName.trim()
    if (!trimmed) return
    const team = await createTeam(trimmed)
    if (team) {
      setNewTeamName('')
      setShowNewTeam(false)
      navigate(`/skills/catalog/${team.id}`)
    }
  }

  const handleDeleteTeam = async () => {
    if (!teamId) return
    await deleteTeam(teamId)
    navigate('/skills/catalog')
  }

  const handleCreateGroup = async () => {
    if (!teamId) return
    const trimmed = newGroupName.trim()
    if (!trimmed) return
    await createSkillGroup(teamId, trimmed)
    setNewGroupName('')
    setShowNewGroup(false)
  }

  const handleCreateSkill = async (groupId: string) => {
    if (!teamId) return
    const name = newSkillNames[groupId]?.trim()
    if (!name) return
    await createSkill(groupId, teamId, name)
    setNewSkillNames((prev) => ({ ...prev, [groupId]: '' }))
    setShowNewSkill(null)
  }

  const handleReorderGroup = (groupId: string, direction: 'up' | 'down') => {
    if (!teamId) return
    const groups = teamSkillGroups
      .filter((g) => g.team_id === teamId)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = groups.findIndex((g) => g.id === groupId)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === groups.length - 1) return
    const newOrder = [...groups]
    const swap = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]]
    reorderSkillGroups(
      teamId,
      newOrder.map((g) => g.id),
    )
  }

  const handleReorderSkill = (
    groupId: string,
    skillId: string,
    direction: 'up' | 'down',
  ) => {
    const groupSkills = teamSkills
      .filter((s) => s.group_id === groupId)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = groupSkills.findIndex((s) => s.id === skillId)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === groupSkills.length - 1) return
    const newOrder = [...groupSkills]
    const swap = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]]
    reorderSkills(
      groupId,
      newOrder.map((s) => s.id),
    )
  }

  const availableProfiles = profiles.filter(
    (p) => !teamMembers.some((m) => m.user_id === p.id),
  )

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading && teams.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-950" />
      </div>
    )
  }

  return (
    <div className="flex gap-[24px] h-full">
      {/* Left Panel — Team List */}
      <div className="w-[260px] shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="font-heading text-[18px] font-medium text-forest-950">
            Teams
          </h2>
          <button
            type="button"
            onClick={() => setShowNewTeam(true)}
            className="flex items-center gap-[4px] px-[10px] py-[6px] bg-forest-950 text-white rounded-[8px] font-body text-[13px] font-semibold hover:bg-forest-800 transition-colors"
          >
            <Plus size={14} weight="bold" />
            Neues Team
          </button>
        </div>

        {showNewTeam && (
          <div className="flex items-center gap-[4px] mb-[8px]">
            <input
              autoFocus
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTeam()
                if (e.key === 'Escape') {
                  setShowNewTeam(false)
                  setNewTeamName('')
                }
              }}
              placeholder="Teamname…"
              className="flex-1 border border-sand-300 rounded-[6px] px-[8px] py-[6px] font-body text-[13px] outline-none focus:border-mint-400"
            />
            <button
              type="button"
              onClick={handleCreateTeam}
              className="text-mint-500 hover:text-mint-600"
            >
              <Check size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewTeam(false)
                setNewTeamName('')
              }}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-[4px]">
          {teams.map((team) => {
            const memberCount = teamId === team.id ? teamMembers.length : 0
            const isActive = team.id === teamId
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => navigate(`/skills/catalog/${team.id}`)}
                className={`flex items-center justify-between px-[12px] py-[10px] rounded-[8px] font-body text-[14px] text-left transition-colors ${
                  isActive
                    ? 'bg-sand-100 font-semibold text-forest-950'
                    : 'text-forest-950 hover:bg-sand-50'
                }`}
              >
                <span className="truncate">{team.name}</span>
                {isActive && memberCount > 0 && (
                  <span className="shrink-0 bg-sand-200 text-forest-950 rounded-full px-[6px] py-[1px] text-[11px] font-semibold">
                    {memberCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Panel — Team Detail */}
      <div className="flex-1 min-w-0">
        {!selectedTeam ? (
          <div className="flex items-center justify-center h-[300px] text-neutral-400 font-body text-[14px]">
            Team auswählen oder neues Team erstellen
          </div>
        ) : (
          <div className="flex flex-col gap-[24px]">
            {/* Team Header */}
            <div className="flex items-center justify-between">
              <InlineEditField
                value={selectedTeam.name}
                onSave={(name) => updateTeam(selectedTeam.id, { name })}
                className="font-heading text-[20px] font-medium text-forest-950"
              />
              <button
                type="button"
                onClick={handleDeleteTeam}
                className="flex items-center gap-[4px] px-[10px] py-[6px] text-coral-600 hover:bg-coral-50 rounded-[8px] font-body text-[13px] font-semibold transition-colors"
              >
                <Trash size={16} />
                Team löschen
              </button>
            </div>

            {/* Members Section */}
            <div className="bg-white rounded-[8px] border border-sand-200 p-[16px]">
              <div className="flex items-center justify-between mb-[12px]">
                <h3 className="font-body text-[14px] font-semibold text-forest-950">
                  Mitglieder
                </h3>
                <button
                  type="button"
                  onClick={() => setAddingMember(true)}
                  className="flex items-center gap-[4px] text-mint-600 hover:text-mint-700 font-body text-[13px] font-semibold transition-colors"
                >
                  <UserPlus size={16} />
                  Mitglied hinzufügen
                </button>
              </div>

              {addingMember && availableProfiles.length > 0 && (
                <div className="mb-[12px] flex items-center gap-[8px]">
                  <select
                    className="flex-1 border border-sand-300 rounded-[6px] px-[8px] py-[6px] font-body text-[13px] outline-none focus:border-mint-400"
                    defaultValue=""
                    onChange={async (e) => {
                      if (e.target.value && teamId) {
                        await addTeamMember(teamId, e.target.value)
                        setAddingMember(false)
                      }
                    }}
                  >
                    <option value="" disabled>
                      Mitglied wählen…
                    </option>
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAddingMember(false)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              )}

              {teamMembers.length === 0 ? (
                <p className="font-body text-[13px] text-neutral-400">
                  Noch keine Mitglieder
                </p>
              ) : (
                <div className="flex flex-col gap-[4px]">
                  {teamMembers.map((member) => {
                    const profile = profiles.find(
                      (p) => p.id === member.user_id,
                    )
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-[6px] px-[8px] rounded-[6px] hover:bg-sand-50"
                      >
                        <div className="flex flex-col">
                          <span className="font-body text-[13px] font-semibold text-forest-950">
                            {profile?.full_name || 'Unbekannt'}
                          </span>
                          <span className="font-body text-[11px] text-neutral-400">
                            {profile?.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            teamId &&
                            removeTeamMember(teamId, member.user_id)
                          }
                          className="text-neutral-400 hover:text-coral-600 transition-colors"
                          title="Entfernen"
                        >
                          <X size={16} weight="bold" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Skill Groups Section */}
            <div>
              <div className="flex items-center justify-between mb-[12px]">
                <h3 className="font-body text-[14px] font-semibold text-forest-950">
                  Skillkatalog
                </h3>
              </div>

              {teamSkillGroups
                .filter((g) => g.team_id === teamId)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((group) => {
                  const groupSkills = teamSkills
                    .filter((s) => s.group_id === group.id)
                    .sort((a, b) => a.sort_order - b.sort_order)
                  const isCollapsed = collapsed[group.id] ?? false

                  return (
                    <div key={group.id} className="mb-[12px]">
                      {/* Group header */}
                      <div
                        className={`flex items-center gap-[8px] p-[12px] bg-sand-100 border-l-[3px] border-mint-400 rounded-t-[4px] ${
                          isCollapsed ? 'rounded-b-[4px]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="shrink-0 text-neutral-500 hover:text-forest-950 transition-colors"
                        >
                          <CaretUp
                            size={16}
                            className={`transition-transform ${
                              isCollapsed ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <InlineEditField
                            value={group.name}
                            onSave={(name) =>
                              updateSkillGroup(group.id, { name })
                            }
                            className="font-body text-[14px] font-semibold uppercase text-forest-950"
                          />
                        </div>
                        <span className="font-body text-[12px] text-neutral-400">
                          {groupSkills.length} Skills
                        </span>
                        <div className="flex items-center gap-[2px]">
                          <button
                            type="button"
                            onClick={() =>
                              handleReorderGroup(group.id, 'up')
                            }
                            className="p-[2px] text-neutral-400 hover:text-forest-950 transition-colors"
                            title="Nach oben"
                          >
                            <CaretUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReorderGroup(group.id, 'down')
                            }
                            className="p-[2px] text-neutral-400 hover:text-forest-950 transition-colors"
                            title="Nach unten"
                          >
                            <CaretDown size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSkillGroup(group.id)}
                          className="text-neutral-400 hover:text-coral-600 transition-colors"
                          title="Gruppe löschen"
                        >
                          <Trash size={14} />
                        </button>
                      </div>

                      {/* Skills list */}
                      {!isCollapsed && (
                        <div className="bg-white border border-t-0 border-sand-200 rounded-b-[8px] overflow-hidden">
                          {groupSkills.map((skill, idx) => (
                            <div
                              key={skill.id}
                              className={`flex items-center gap-[8px] px-[12px] py-[8px] ${
                                idx < groupSkills.length - 1
                                  ? 'border-b border-sand-200'
                                  : ''
                              }`}
                            >
                              <InlineEditField
                                value={skill.name}
                                onSave={(name) =>
                                  updateSkill(skill.id, { name })
                                }
                                className="flex-1 font-body text-[13px] text-forest-950"
                              />
                              <div className="flex items-center gap-[2px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReorderSkill(
                                      group.id,
                                      skill.id,
                                      'up',
                                    )
                                  }
                                  className="p-[2px] text-neutral-400 hover:text-forest-950 transition-colors"
                                  title="Nach oben"
                                >
                                  <CaretUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReorderSkill(
                                      group.id,
                                      skill.id,
                                      'down',
                                    )
                                  }
                                  className="p-[2px] text-neutral-400 hover:text-forest-950 transition-colors"
                                  title="Nach unten"
                                >
                                  <CaretDown size={14} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteSkill(skill.id)}
                                className="text-neutral-400 hover:text-coral-600 transition-colors"
                                title="Skill löschen"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          ))}

                          {/* Add skill */}
                          {showNewSkill === group.id ? (
                            <div className="flex items-center gap-[4px] px-[12px] py-[6px] border-t border-sand-200">
                              <input
                                autoFocus
                                value={newSkillNames[group.id] ?? ''}
                                onChange={(e) =>
                                  setNewSkillNames((prev) => ({
                                    ...prev,
                                    [group.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')
                                    handleCreateSkill(group.id)
                                  if (e.key === 'Escape')
                                    setShowNewSkill(null)
                                }}
                                placeholder="Skillname…"
                                className="flex-1 border border-sand-300 rounded-[4px] px-[6px] py-[4px] font-body text-[13px] outline-none focus:border-mint-400"
                              />
                              <button
                                type="button"
                                onClick={() => handleCreateSkill(group.id)}
                                className="text-mint-500 hover:text-mint-600"
                              >
                                <Check size={16} weight="bold" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowNewSkill(null)}
                                className="text-neutral-400 hover:text-neutral-600"
                              >
                                <X size={16} weight="bold" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowNewSkill(group.id)}
                              className="flex items-center gap-[4px] px-[12px] py-[8px] w-full text-left text-mint-600 hover:bg-sand-50 font-body text-[13px] font-semibold transition-colors border-t border-sand-200"
                            >
                              <Plus size={14} weight="bold" />
                              Skill hinzufügen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

              {/* Add group */}
              {showNewGroup ? (
                <div className="flex items-center gap-[4px] mt-[8px]">
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateGroup()
                      if (e.key === 'Escape') {
                        setShowNewGroup(false)
                        setNewGroupName('')
                      }
                    }}
                    placeholder="Gruppenname…"
                    className="flex-1 border border-sand-300 rounded-[6px] px-[8px] py-[6px] font-body text-[13px] outline-none focus:border-mint-400"
                  />
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    className="text-mint-500 hover:text-mint-600"
                  >
                    <Check size={18} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewGroup(false)
                      setNewGroupName('')
                    }}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewGroup(true)}
                  className="flex items-center gap-[4px] mt-[8px] text-forest-950 hover:text-forest-800 font-body text-[13px] font-semibold transition-colors"
                >
                  <Plus size={14} weight="bold" />
                  Neue Gruppe
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
