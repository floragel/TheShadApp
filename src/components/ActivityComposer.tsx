import { type FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Team = { id: string; name: string; kind: 'house' | 'design' }

export function ActivityComposer({ userId, onClose, onSaved }: { userId:string; onClose:()=>void; onSaved:()=>void }) {
  const [message, setMessage] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])

  useEffect(() => {
    if (supabase) {
      void supabase.from('teams').select('id,name,kind').order('kind').order('name')
        .then(({ data }) => setTeams((data ?? []) as Team[]))
    }
  }, [])

  const handleCheckboxChange = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams([...selectedTeams, teamId])
    } else {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId))
    }
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    const f = new FormData(e.currentTarget)
    
    const { error } = await supabase.from('activities').insert({
      creator_id: userId,
      title: f.get('title'),
      description: f.get('description'),
      category: f.get('category'),
      location: f.get('location'),
      starts_at: f.get('starts'),
      ends_at: f.get('ends'),
      capacity: Number(f.get('capacity')),
      team_id: selectedTeams[0] || null, // Legacy single team compatibility
      team_ids: selectedTeams.length > 0 ? selectedTeams : null // New multi-team array support
    })

    setMessage(error?.message ?? 'Activity created.')
    if (!error) {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="panel-backdrop">
      <aside className="profile-panel" style={{ width: 'min(100%, 540px)' }}>
        <div className="panel-header">
          <h2>Create activity</h2>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>
        <form className="profile-form" onSubmit={submit}>
          <label>Title<input name="title" required maxLength={80} /></label>
          <label>Description<textarea name="description" rows={3} /></label>
          <label>Category
            <select name="category">
              <option>Active</option>
              <option>Chill</option>
              <option>Food</option>
              <option>Creative</option>
            </select>
          </label>
          
          <label style={{ display: 'grid', gap: '8px' }}>For teams (optional - select multiple)
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '130px', overflowY: 'auto', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid var(--line)' }}>
              {teams.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', margin: 0, color: 'var(--ink)' }}>
                  <input 
                    type="checkbox" 
                    value={t.id} 
                    checked={selectedTeams.includes(t.id)}
                    onChange={(e) => handleCheckboxChange(t.id, e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  {t.kind === 'house' ? '🏠' : '🎨'} {t.name}
                </label>
              ))}
            </div>
          </label>

          <label>Location
            <select name="location" required>
              <option>Volley Ball Field</option>
              <option>Cafeteria</option>
              <option>Floor 2 Lounge</option>
              <option>Floor 3 Lounge</option>
              <option>Floor 4 Lounge</option>
              <option>Floor 5 Lounge</option>
              <option>Roll Call</option>
              <option>Lobby</option>
              <option>Fireside</option>
            </select>
          </label>
          <div className="form-row">
            <label>Starts<input type="datetime-local" name="starts" required /></label>
            <label>Ends<input type="datetime-local" name="ends" required /></label>
          </div>
          <label>Capacity<input type="number" name="capacity" min="2" max="100" defaultValue="8" required /></label>
          <button className="auth-submit">Publish activity</button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </aside>
    </div>
  )
}
