import { type FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Team = { id: string; name: string; kind: 'house' | 'design' }

export function ActivityComposer({ userId, onClose, onSaved }: { userId:string; onClose:()=>void; onSaved:()=>void }) {
  const [message,setMessage]=useState('')
  const [teams,setTeams]=useState<Team[]>([])
  useEffect(()=>{if(supabase)void supabase.from('teams').select('id,name,kind').order('kind').order('name').then(({data})=>setTeams((data??[]) as Team[]))},[])
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!supabase)return;const f=new FormData(e.currentTarget);const team=f.get('team');const {error}=await supabase.from('activities').insert({creator_id:userId,title:f.get('title'),description:f.get('description'),category:f.get('category'),location:f.get('location'),starts_at:f.get('starts'),ends_at:f.get('ends'),capacity:Number(f.get('capacity')),team_id:team||null});setMessage(error?.message??'Activity created.');if(!error){onSaved();onClose()}}
  return <div className="panel-backdrop"><aside className="profile-panel"><div className="panel-header"><h2>Create activity</h2><button className="icon-button" onClick={onClose}><X/></button></div><form className="profile-form" onSubmit={submit}><label>Title<input name="title" required maxLength={80}/></label><label>Description<textarea name="description" rows={3}/></label><label>Category<select name="category"><option>Active</option><option>Chill</option><option>Food</option><option>Creative</option></select></label><label>For a team (optional)<select name="team"><option value="">Everyone</option>{teams.map(t=><option key={t.id} value={t.id}>{t.kind==='house'?'House':'Design'} — {t.name}</option>)}</select></label><label>Location<select name="location" required><option>The Quad</option><option>Residences</option><option>Dining Hall</option><option>Science Building</option><option>Macdonald Library</option><option>Athletic Centre</option></select></label><div className="form-row"><label>Starts<input type="datetime-local" name="starts" required/></label><label>Ends<input type="datetime-local" name="ends" required/></label></div><label>Capacity<input type="number" name="capacity" min="2" max="100" defaultValue="8" required/></label><button className="auth-submit">Publish activity</button>{message&&<p className="form-message">{message}</p>}</form></aside></div>
}
