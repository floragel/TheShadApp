/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Compass, Plus, Search, Sparkles, UserRound, ShieldCheck } from 'lucide-react'
import { ActivityCard } from './components/ActivityCard'
import { AuthScreen } from './components/AuthScreen'
import { ProfilePanel } from './components/ProfilePanel'
import { StaffDashboard } from './components/StaffDashboard'
import { ActivityComposer } from './components/ActivityComposer'
import { useAuth } from './context/auth-context'
import type { Activity } from './types/activity'
import type { ActivityCategory } from './types/activity'
import { supabase } from './lib/supabase'
import './styles.css'

const filters: Array<'All' | ActivityCategory> = ['All', 'Active', 'Chill', 'Food', 'Creative']

export default function App() {
  const { user, loading } = useAuth()
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All')
  const [joined, setJoined] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const [composerOpen,setComposerOpen]=useState(false)
  const [role,setRole]=useState<'shad'|'pa'|'lt'>('shad')
  const [liveActivities,setLiveActivities]=useState<Activity[]>([])
  const [announcements,setAnnouncements]=useState<Array<{id:string;title:string;body:string;priority:string}>>([])
  const [schedule,setSchedule]=useState<Array<{id:string;title:string;starts_at:string;location:string}>>([])
  const [aiResult,setAiResult]=useState(''); const [aiBusy,setAiBusy]=useState(false)
  const [aiPrompt,setAiPrompt]=useState('')
  const loadLive=async()=>{if(!supabase||!user)return; const [a,n,s,r,m]=await Promise.all([supabase.from('activities').select('*, profiles!creator_id(display_name), activity_members(count)').gte('ends_at',new Date().toISOString()).order('starts_at'),supabase.from('announcements').select('id,title,body,priority').order('created_at',{ascending:false}).limit(5),supabase.from('schedule_events').select('id,title,starts_at,location').gte('ends_at',new Date().toISOString()).order('starts_at').limit(8),supabase.from('user_roles').select('role').eq('user_id',user.id).single(),supabase.from('activity_members').select('activity_id').eq('user_id',user.id)]);
    if(a.data)setLiveActivities(a.data.map((x:any)=>({id:x.id,title:x.title,description:x.description,category:x.category,emoji:x.category==='Active'?'🏐':x.category==='Food'?'🧋':x.category==='Creative'?'🎨':'🃏',time:new Date(x.starts_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),location:x.location,host:x.profiles?.display_name??'SHAD',attendees:x.activity_members?.[0]?.count??0,capacity:x.capacity,accent:'#d8c5ff'}))); if(n.data)setAnnouncements(n.data);if(s.data)setSchedule(s.data);if(r.data)setRole(r.data.role);if(m.data)setJoined(m.data.map(x=>x.activity_id))}
  useEffect(()=>{void loadLive()},[user])
  const visibleActivities = useMemo(
    () => activeFilter === 'All' ? liveActivities : liveActivities.filter((activity) => activity.category === activeFilter),
    [activeFilter,liveActivities],
  )

  if (loading) return <div className="app-loading"><span className="brand-mark"><Sparkles size={20} /></span><p>Getting LinkUp ready…</p></div>
  if (!user) return <AuthScreen />

  const toggleJoin = async (id: string) => {
    if(!supabase||!user)return; const isJoined=joined.includes(id); const result=isJoined?await supabase.from('activity_members').delete().eq('activity_id',id).eq('user_id',user.id):await supabase.from('activity_members').insert({activity_id:id,user_id:user.id}); if(!result.error)await loadLive()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LinkUp home">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>link<span>up</span></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a className="active" href="#discover"><Compass size={18} /> Discover</a>
          <a href="#schedule"><CalendarDays size={18} /> My plans</a>
        </nav>
        <div className="header-actions">
          {role!=='shad'&&<button className="staff-button" onClick={()=>setStaffOpen(true)}><ShieldCheck size={17}/> Staff</button>}
          <button className="icon-button" aria-label="Notifications"><Bell size={20} /></button>
          <button className="avatar" aria-label="Open profile" onClick={() => setProfileOpen(true)}>{(user.user_metadata.display_name || user.email || 'ME').slice(0, 2).toUpperCase()}</button>
        </div>
      </header>

      <main id="top">
        {(announcements.length>0||schedule.length>0)&&<section className="live-info"><div><p className="eyebrow">Latest announcements</p>{announcements.map(a=><article key={a.id} className={`notice ${a.priority}`}><strong>{a.title}</strong><span>{a.body}</span></article>)}</div><div><p className="eyebrow">Coming up</p>{schedule.map(e=><article key={e.id} className="schedule-row"><time>{new Date(e.starts_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time><div><strong>{e.title}</strong><span>{e.location}</span></div></article>)}</div></section>}
        <section className="hero">
          <div className="hero-copy">
            <p className="overline"><span /> Free time until 7:00 PM</p>
            <h1>What’s the <em>move?</em></h1>
            <p>Find your people, try something new, and make every free block count.</p>
          </div>
          <button className="create-button" onClick={()=>setComposerOpen(true)}><Plus size={20} /> Create an activity</button>
        </section>

        <section className="ai-prompt" aria-label="AI activity finder">
          <div className="ai-icon"><Sparkles size={22} /></div>
          <div>
            <label htmlFor="activity-search">Tell us what you feel like doing</label>
            <p>Try “something active with new people for 30 minutes”</p>
          </div>
          <div className="search-box">
            <input id="activity-search" placeholder="I want to…" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} />
            <button disabled={aiBusy} aria-label="Find activities" onClick={async()=>{if(!supabase||!aiPrompt.trim())return;setAiBusy(true);setAiResult('');const {data,error}=await supabase.functions.invoke('activity-match',{body:{prompt:aiPrompt}});setAiResult(error?.message??data?.error??data?.recommendation);setAiBusy(false)}}><Search size={19} /></button>
          </div>
          {aiResult&&<p className="ai-result">{aiResult}</p>}
        </section>

        <section className="discover-section" id="discover">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Happening around you</p>
              <h2>Jump into something</h2>
            </div>
            <div className="filters" aria-label="Filter activities">
              {filters.map((filter) => (
                <button key={filter} className={filter === activeFilter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="activity-grid">
            {visibleActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} joined={joined.includes(activity.id)} onJoin={toggleJoin} />
            ))}
            {visibleActivities.length === 0 && (
              <div className="empty-state"><span>✨</span><h3>No activities here yet</h3><p>Be the first to create a real plan.</p></div>
            )}
          </div>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className="active" href="#discover"><Compass size={21} /><span>Discover</span></a>
        <a href="#schedule"><CalendarDays size={21} /><span>My plans</span></a>
        <button onClick={()=>setComposerOpen(true)}><Plus size={24} aria-label="Create activity" /></button>
        <a href="#search"><Search size={21} /><span>Search</span></a>
        <button className="mobile-profile" onClick={() => setProfileOpen(true)}><UserRound size={21} /><span>Profile</span></button>
      </nav>
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
      {staffOpen&&user&&role!=='shad'&&<StaffDashboard userId={user.id} role={role} onClose={()=>setStaffOpen(false)} onSaved={()=>void loadLive()}/>}
      {composerOpen&&user&&<ActivityComposer userId={user.id} onClose={()=>setComposerOpen(false)} onSaved={()=>void loadLive()}/>}
    </div>
  )
}
