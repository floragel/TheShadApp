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
const scoreNotice=(notice:{priority:string;author_role?:string;team_id?:string|null},ownTeams:string[])=>({urgent:300,important:200,normal:100}[notice.priority]??0)+(notice.author_role==='lt'?30:notice.author_role==='pa'?20:0)+(notice.team_id&&ownTeams.includes(notice.team_id)?15:0)

export default function App() {
  const { user, loading } = useAuth()
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All')
  const [joined, setJoined] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const [composerOpen,setComposerOpen]=useState(false)
  const [role,setRole]=useState<'shad'|'pa'|'lt'>('shad')
  const [liveActivities,setLiveActivities]=useState<Activity[]>([])
  const [announcements,setAnnouncements]=useState<Array<{id:string;title:string;body:string;priority:string;author_role?:string;team_id?:string|null}>>([])
  const [schedule,setSchedule]=useState<Array<{id:string;title:string;starts_at:string;location:string}>>([])
  const [aiResult,setAiResult]=useState(''); const [aiBusy,setAiBusy]=useState(false)
  const [aiPrompt,setAiPrompt]=useState('')
  const [view,setView]=useState<'discover'|'plans'>('discover');const[notificationsOpen,setNotificationsOpen]=useState(false);const[teamIds,setTeamIds]=useState<string[]>([]);const[dragged,setDragged]=useState<string|null>(null)
  const loadLive=async()=>{if(!supabase||!user)return; const [a,n,s,r,m,tm]=await Promise.all([supabase.from('activities').select('*, profiles!creator_id(display_name), activity_members(count)').gte('ends_at',new Date().toISOString()).order('starts_at'),supabase.from('announcements').select('id,title,body,priority,created_at,author_role,team_id').order('created_at',{ascending:false}).limit(12),supabase.from('schedule_events').select('id,title,starts_at,location').gte('ends_at',new Date().toISOString()).order('starts_at').limit(12),supabase.from('user_roles').select('role').eq('user_id',user.id).single(),supabase.from('activity_members').select('activity_id').eq('user_id',user.id),supabase.from('team_memberships').select('team_id').eq('user_id',user.id)]);
    const ownTeams=tm.data?.map(x=>x.team_id)??[];if(a.data)setLiveActivities(a.data.map((x:any)=>({id:x.id,title:x.title,description:x.description,category:x.category,emoji:x.category==='Active'?'🏐':x.category==='Food'?'🧋':x.category==='Creative'?'🎨':'🃏',time:new Date(x.starts_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),location:x.location,host:x.profiles?.display_name??'Staff',attendees:x.activity_members?.[0]?.count??0,capacity:x.capacity,accent:'#d8c5ff',teamId:x.team_id}))); if(n.data)setAnnouncements(n.data.sort((x:any,y:any)=>scoreNotice(y,ownTeams)-scoreNotice(x,ownTeams)));if(s.data)setSchedule(s.data);if(r.data)setRole(r.data.role);if(m.data)setJoined(m.data.map(x=>x.activity_id));setTeamIds(ownTeams)}
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
          <button className={view==='discover'?'active':''} onClick={()=>setView('discover')}><Compass size={18} /> Discover</button>
          <button className={view==='plans'?'active':''} onClick={()=>setView('plans')}><CalendarDays size={18} /> My plans</button>
        </nav>
        <div className="header-actions">
          {role!=='shad'&&<button className="staff-button" onClick={()=>setStaffOpen(true)}><ShieldCheck size={17}/> Staff</button>}
          <button className="icon-button notification-trigger" aria-label="Notifications" onClick={()=>setNotificationsOpen(!notificationsOpen)}><Bell size={20} />{announcements.length>0&&<i>{announcements.length}</i>}</button>
          <button className="avatar" aria-label="Open profile" onClick={() => setProfileOpen(true)}>{(user.user_metadata.display_name || user.email || 'ME').slice(0, 2).toUpperCase()}</button>
        </div>
      </header>

      {notificationsOpen&&<aside className="notification-center"><div className="panel-header"><h3>Notifications</h3><button onClick={()=>setNotificationsOpen(false)}>×</button></div>{announcements.map(a=><article key={a.id} className={`notice ${a.priority}`}><strong>{a.title}</strong><span>{a.body}</span></article>)}</aside>}
      <main id="top">
        {view==='plans'?<section className="plans-page"><p className="eyebrow">Your schedule</p><h1>My <em>plans</em></h1><div className="plans-layout"><div><h2>Activities you joined</h2><div className="activity-grid">{liveActivities.filter(a=>joined.includes(a.id)).map(a=><ActivityCard key={a.id} activity={a} joined onJoin={toggleJoin}/>)}{joined.length===0&&<div className="empty-state">No joined activities yet.</div>}</div></div><div><h2>Official agenda</h2>{schedule.map(e=><article key={e.id} className="schedule-row"><time>{new Date(e.starts_at).toLocaleString([],{weekday:'short',hour:'2-digit',minute:'2-digit'})}</time><div><strong>{e.title}</strong><span>{e.location}</span></div></article>)}</div></div></section>:<>
        {(announcements.length>0||schedule.length>0)&&<section className="live-info"><div><p className="eyebrow">Latest announcements</p>{announcements.map(a=><article key={a.id} className={`notice ${a.priority}`}><strong>{a.title}</strong><span>{a.body}</span></article>)}</div><div><p className="eyebrow">Coming up</p>{schedule.map(e=><article key={e.id} className="schedule-row"><time>{new Date(e.starts_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time><div><strong>{e.title}</strong><span>{e.location}</span></div></article>)}</div></section>}
        <section className="hero">
          <div className="hero-copy">
            <p className="overline"><span /> Free time until 7:00 PM</p>
            <h1>What’s the <em>move?</em></h1>
            <p>Find your people, try something new, and make every free block count.</p>
          </div>
          {role!=='shad'&&<button className="create-button" onClick={()=>setComposerOpen(true)}><Plus size={20} /> Create an activity</button>}
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

          {teamIds.length>0&&liveActivities.some(a=>a.teamId&&teamIds.includes(a.teamId))&&<div className="team-now"><p className="eyebrow">Your teams right now</p>{liveActivities.filter(a=>a.teamId&&teamIds.includes(a.teamId)).map(a=><span key={a.id}><strong>{a.title}</strong> · {a.location} · {a.time}</span>)}</div>}
          <div className="activity-grid" aria-label="Drag activities to reorder them">
            {visibleActivities.map((activity) => (
              <div key={activity.id} draggable onDragStart={()=>setDragged(activity.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(!dragged||dragged===activity.id)return;setLiveActivities(cur=>{const copy=[...cur],from=copy.findIndex(x=>x.id===dragged),to=copy.findIndex(x=>x.id===activity.id);const [item]=copy.splice(from,1);copy.splice(to,0,item);return copy});setDragged(null)}}><ActivityCard activity={activity} joined={joined.includes(activity.id)} onJoin={toggleJoin} /></div>
            ))}
            {visibleActivities.length === 0 && (
              <div className="empty-state"><span>✨</span><h3>No activities here yet</h3><p>Be the first to create a real plan.</p></div>
            )}
          </div>
        </section></>}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={view==='discover'?'mobile-profile active':''} onClick={()=>setView('discover')}><Compass size={21} /><span>Discover</span></button>
        <button className={view==='plans'?'mobile-profile active':''} onClick={()=>setView('plans')}><CalendarDays size={21} /><span>My plans</span></button>
        {role!=='shad'?<button onClick={()=>setComposerOpen(true)}><Plus size={24} aria-label="Create activity" /></button>:<span/>}
        <a href="#search"><Search size={21} /><span>Search</span></a>
        <button className="mobile-profile" onClick={() => setProfileOpen(true)}><UserRound size={21} /><span>Profile</span></button>
      </nav>
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
      {staffOpen&&user&&role!=='shad'&&<StaffDashboard userId={user.id} role={role} onClose={()=>setStaffOpen(false)} onSaved={()=>void loadLive()}/>}
      {composerOpen && user && role !== 'shad' && (
        <ActivityComposer userId={user.id} onClose={() => setComposerOpen(false)} onSaved={() => void loadLive()} />
      )}
    </div>
  )
}
