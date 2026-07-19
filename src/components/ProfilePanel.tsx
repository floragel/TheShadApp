import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { Check, LogOut, ShieldCheck, UsersRound, X } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabase'
import type { Profile, Team, TeamMembership } from '../types/database'

interface ProfilePanelProps { onClose: () => void }

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    void Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('teams').select('*').order('kind').order('name'),
      supabase.from('team_memberships').select('user_id, team_id, team_kind, team:teams(*)').eq('user_id', user.id),
    ]).then(([profileResult, teamsResult, membershipsResult]) => {
      if (profileResult.data) {
        const nextProfile = profileResult.data as Profile
        setProfile(nextProfile)
        setName(nextProfile.display_name)
        setBio(nextProfile.bio)
      }
      if (teamsResult.data) setTeams(teamsResult.data as Team[])
      if (membershipsResult.data) setMemberships(membershipsResult.data as unknown as TeamMembership[])
      setLoading(false)
    })
  }, [user])

  const selectedByKind = useMemo(() => new Map(memberships.map((membership) => [membership.team?.kind, membership.team_id])), [memberships])

  const selectTeam = async (team: Team) => {
    if (!supabase || !user) return
    setMessage('')
    const currentTeamId = selectedByKind.get(team.kind)
    if (currentTeamId === team.id) return

    if (currentTeamId) {
      const { error } = await supabase.from('team_memberships').delete().eq('user_id', user.id).eq('team_id', currentTeamId)
      if (error) { setMessage(error.message); return }
    }
    const { error } = await supabase.from('team_memberships').insert({ user_id: user.id, team_id: team.id, team_kind: team.kind })
    if (error) { setMessage(error.message); return }
    setMemberships((current) => [
      ...current.filter((membership) => membership.team?.kind !== team.kind),
      { user_id: user.id, team_id: team.id, team_kind: team.kind, team },
    ])
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    const { data, error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim() }).eq('id', user.id).select().single()
    setMessage(error ? error.message : 'Profile saved.')
    if (data) setProfile(data as Profile)
  }

  const teamGroup = (kind: 'house' | 'design') => teams.filter((team) => team.kind === kind)

  return (
    <div className="panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="profile-panel" aria-label="Account and teams">
        <div className="panel-header"><div><p className="eyebrow">Your account</p><h2>Profile & teams</h2></div><button className="icon-button" onClick={onClose} aria-label="Close profile"><X size={20} /></button></div>
        {loading ? <div className="profile-loading">Loading your profile…</div> : (
          <>
            <div className="profile-identity"><div className="large-avatar">{(profile?.display_name || user?.email || '?').slice(0, 2).toUpperCase()}</div><div><strong>{profile?.display_name}</strong><span>{user?.email}</span></div><ShieldCheck size={21} aria-label="Verified account" /></div>
            <form className="profile-form" onSubmit={saveProfile}>
              <label>Display name<input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label>About you<textarea maxLength={180} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Interests, favourite activities…" /></label>
              <button className="save-button">Save profile</button>
            </form>
            <div className="team-picker">
              <div className="team-heading"><UsersRound size={18} /><div><strong>House team</strong><span>Choose one</span></div></div>
              <div className="team-options">{teamGroup('house').map((team) => <button key={team.id} className={selectedByKind.get('house') === team.id ? 'selected' : ''} onClick={() => void selectTeam(team)} style={{ '--team-color': team.color } as CSSProperties}><span />{team.name}{selectedByKind.get('house') === team.id && <Check size={15} />}</button>)}</div>
              <div className="team-heading"><UsersRound size={18} /><div><strong>Design team</strong><span>Choose one</span></div></div>
              <div className="team-options">{teamGroup('design').map((team) => <button key={team.id} className={selectedByKind.get('design') === team.id ? 'selected' : ''} onClick={() => void selectTeam(team)} style={{ '--team-color': team.color } as CSSProperties}><span />{team.name}{selectedByKind.get('design') === team.id && <Check size={15} />}</button>)}</div>
            </div>
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="sign-out-button" onClick={() => void signOut()}><LogOut size={18} /> Sign out</button>
          </>
        )}
      </aside>
    </div>
  )
}
