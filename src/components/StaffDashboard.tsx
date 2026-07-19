/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type FormEvent } from 'react'
import { Megaphone, X, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function StaffDashboard({ userId, role, onClose, onSaved }: { userId:string; role:'pa'|'lt'; onClose:()=>void; onSaved:()=>void }) {
  const [tab,setTab]=useState<'schedule'|'announcement'|'teams'>('schedule'); const [message,setMessage]=useState('');const[teams,setTeams]=useState<any[]>([]);const[pas,setPas]=useState<any[]>([])
  useEffect(()=>{if(!supabase||role!=='lt')return;void Promise.all([supabase.from('teams').select('id,name,kind').order('kind').order('name'),supabase.from('user_roles').select('user_id,profiles(display_name)').eq('role','pa')]).then(([t,p])=>{setTeams(t.data??[]);setPas(p.data??[])})},[role])
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault(); if(!supabase)return; const f=new FormData(e.currentTarget); setMessage('Saving…')
    const result=tab==='schedule' ? await supabase.from('schedule_events').insert({title:f.get('title'),description:f.get('body'),location:f.get('location'),starts_at:f.get('starts'),ends_at:f.get('ends'),audience:f.get('audience'),created_by:userId}) : await supabase.from('announcements').insert({title:f.get('title'),body:f.get('body'),priority:f.get('priority'),audience:f.get('audience'),created_by:userId})
    setMessage(result.error?.message ?? 'Published.'); if(!result.error){e.currentTarget.reset();onSaved()}
  }
  return <div className="panel-backdrop"><aside className="profile-panel staff-panel"><div className="panel-header"><div><p className="eyebrow">PA / LT tools</p><h2>Staff dashboard</h2></div><button className="icon-button" onClick={onClose}><X/></button></div>
    <div className="auth-tabs"><button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}><CalendarPlus size={16}/> Agenda</button><button className={tab==='announcement'?'active':''} onClick={()=>setTab('announcement')}><Megaphone size={16}/> News</button>{role==='lt'&&<button className={tab==='teams'?'active':''} onClick={()=>setTab('teams')}>PA teams</button>}</div>
    {tab==='teams'?<form className="profile-form staff-form" onSubmit={async e=>{e.preventDefault();if(!supabase)return;const f=new FormData(e.currentTarget);const {error}=await supabase.from('team_pa_assignments').upsert({team_id:f.get('team'),pa_user_id:f.get('pa'),assigned_by:userId});setMessage(error?.message??'PA assigned.')}}><label>Team<select name="team">{teams.map(t=><option key={t.id} value={t.id}>{t.kind==='house'?'House':'Design'} — {t.name}</option>)}</select></label><label>PA<select name="pa">{pas.map(p=><option key={p.user_id} value={p.user_id}>{p.profiles?.display_name}</option>)}</select></label><button className="auth-submit">Assign PA</button>{message&&<p className="form-message">{message}</p>}</form>:<form className="profile-form staff-form" onSubmit={submit}><label>Title<input name="title" required maxLength={100}/></label><label>{tab==='schedule'?'Description':'Message'}<textarea name="body" required rows={4} maxLength={600}/></label>
      {tab==='schedule'&&<><label>Location<input name="location" required/></label><div className="form-row"><label>Starts<input name="starts" type="datetime-local" required/></label><label>Ends<input name="ends" type="datetime-local" required/></label></div></>}
      {tab==='announcement'&&<label>Priority<select name="priority"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label>}
      <label>Audience<select name="audience"><option value="all">Everyone</option><option value="shad">SHAD</option><option value="pa">PA</option><option value="lt">LT</option></select></label><button className="auth-submit">Publish</button>{message&&<p className="form-message">{message}</p>}</form>}
  </aside></div>
}
