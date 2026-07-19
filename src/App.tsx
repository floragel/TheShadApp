/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bell, CalendarDays, Compass, Plus, UserRound, ShieldCheck, MapPin, BarChart3, AlertCircle, CheckCircle, Send } from 'lucide-react'
import { ActivityCard } from './components/ActivityCard'
import { AuthScreen } from './components/AuthScreen'
import { ProfilePanel } from './components/ProfilePanel'
import { StaffDashboard } from './components/StaffDashboard'
import { ActivityComposer } from './components/ActivityComposer'
import { InteractiveMap } from './components/InteractiveMap'
import { useAuth } from './context/auth-context'
import type { Activity } from './types/activity'
import type { ActivityCategory } from './types/activity'
import { supabase } from './lib/supabase'
import './styles.css'

const filters: Array<'All' | ActivityCategory> = ['All', 'Active', 'Chill', 'Food', 'Creative']
const scoreNotice = (notice: { priority: string; author_role?: string; team_id?: string | null }, ownTeams: string[]) =>
  ({ urgent: 300, important: 200, normal: 100 }[notice.priority] ?? 0) +
  (notice.author_role === 'lt' ? 30 : notice.author_role === 'pa' ? 20 : 0) +
  (notice.team_id && ownTeams.includes(notice.team_id) ? 15 : 0)


export default function App() {
  const { user, loading } = useAuth()
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All')
  const [joined, setJoined] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [role, setRole] = useState<'shad' | 'pa' | 'lt'>('shad')
  
  // Dynamic collections
  const [liveActivities, setLiveActivities] = useState<Activity[]>([])
  const [myActivities, setMyActivities] = useState<Activity[]>([])
  const [announcements, setAnnouncements] = useState<Array<any>>([])
  const [schedule, setSchedule] = useState<Array<any>>([])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [dragged, setDragged] = useState<string | null>(null)

  // Staff wish message
  const [wishMessage, setWishMessage] = useState('')
  const [wishSent, setWishSent] = useState(false)

  // View tabs
  const [view, setView] = useState<'discover' | 'plans' | 'map' | 'polls' | 'absences'>('discover')
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // New feature states
  const [waitingList, setWaitingList] = useState<any[]>([])
  const [polls, setPolls] = useState<any[]>([])
  const [myVotes, setMyVotes] = useState<any[]>([])
  const [myAbsences, setMyAbsences] = useState<any[]>([])
  const [selectedMapLocation, setSelectedMapLocation] = useState<string>('Roll Call')
  const [absenceMessage, setAbsenceMessage] = useState('')

  // Request browser notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  const sendPushNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: `${import.meta.env.BASE_URL}logo.png` })
      } catch (e) {
        console.error('Browser push notification failed:', e)
      }
    }
  }

  const loadLive = async () => {
    if (!supabase || !user) return

    // Execute existing live queries
    const [a, n, s, r, m, tm] = await Promise.all([
      supabase.from('activities').select('*, profiles!creator_id(display_name), activity_members(count)').order('starts_at'),
      supabase.from('announcements').select('id,title,body,priority,created_at,author_role,team_id').order('created_at', { ascending: false }).limit(12),
      supabase.from('schedule_events').select('id,title,starts_at,location').gte('ends_at', new Date().toISOString()).order('starts_at').limit(12),
      supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
      supabase.from('activity_members').select('activity_id').eq('user_id', user.id),
      supabase.from('team_memberships').select('team_id').eq('user_id', user.id)
    ])

    // Determine role early to decide which activities to fetch
    const earlyRole = user.email?.includes('lt') ? 'lt' : user.email?.includes('pa') ? 'pa' : (r.data?.role ?? 'shad')
    const isStaff = earlyRole === 'pa' || earlyRole === 'lt'

    // Staff see ALL activities; shads see only their joined/created/team-assigned ones
    let mergedActivities: any[] = []
    const actSelect = 'id, title, description, category, location, starts_at, ends_at, capacity, team_id, team_ids, profiles!creator_id(display_name), activity_members(count)'
    const userTeamIds = tm.data?.map(x => x.team_id) ?? []
    if (isStaff) {
      const { data: allActs } = await supabase.from('activities').select(actSelect).order('starts_at')
      mergedActivities = allActs ?? []
    } else {
      const joinedIds = m.data?.map(x => x.activity_id) ?? []
      const [maByMember, maByCreator] = await Promise.all([
        joinedIds.length > 0
          ? supabase.from('activities').select(actSelect).in('id', joinedIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('activities').select(actSelect).eq('creator_id', user.id)
      ])
      const seenIds = new Set<string>()
      for (const row of [...(maByMember.data ?? []), ...(maByCreator.data ?? [])]) {
        if (!seenIds.has(row.id)) { seenIds.add(row.id); mergedActivities.push(row) }
      }
      // Also include activities assigned to any of the user's teams
      if (userTeamIds.length > 0) {
        const { data: teamActs } = await supabase.from('activities').select(actSelect)
        for (const row of (teamActs ?? [])) {
          if (seenIds.has(row.id)) continue
          const rowTeamIds: string[] = row.team_ids ?? (row.team_id ? [row.team_id] : [])
          if (rowTeamIds.some(tid => userTeamIds.includes(tid))) {
            seenIds.add(row.id)
            mergedActivities.push(row)
          }
        }
      }
    }
    mergedActivities.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    const ma = { data: mergedActivities }

    // Load new feature queries
    const [wl, pl, vt, ab] = await Promise.all([
      supabase.from('activity_waiting_list').select('*'),
      supabase.from('polls').select('*, profiles:created_by(display_name)').order('created_at', { ascending: false }),
      supabase.from('poll_votes').select('*').eq('user_id', user.id),
      supabase.from('attendance_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ])

    const ownTeams = tm.data?.map(x => x.team_id) ?? []

    if (a.data) {
      setLiveActivities(a.data.map((x: any) => ({
        id: x.id,
        title: x.title,
        description: x.description,
        category: x.category,
        emoji: x.category === 'Active' ? '🏐' : x.category === 'Food' ? '🧋' : x.category === 'Creative' ? '🎨' : '🃏',
        time: new Date(x.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        starts_at: x.starts_at,
        ends_at: x.ends_at,
        location: x.location,
        host: x.profiles?.display_name ?? 'Staff',
        attendees: x.activity_members?.[0]?.count ?? 0,
        capacity: x.capacity,
        accent: '#d8c5ff',
        teamId: x.team_id,
        teamIds: x.team_ids
      })))
    }

    if (n.data) {
      setAnnouncements(n.data.sort((x: any, y: any) => scoreNotice(y, ownTeams) - scoreNotice(x, ownTeams)))
      
      // Trigger Web Push Notification if a new announcement is published
      if (n.data.length > 0) {
        const latest = n.data[0]
        const prevSeen = localStorage.getItem('last_seen_announcement_id')
        if (prevSeen && prevSeen !== latest.id && latest.priority === 'urgent') {
          sendPushNotification(`URGENT: ${latest.title}`, latest.body)
        }
        localStorage.setItem('last_seen_announcement_id', latest.id)
      }
    }

    if (s.data) setSchedule(s.data)
    let userRole: 'shad' | 'pa' | 'lt' = 'shad'
    if (user.email?.includes('lt')) {
      userRole = 'lt'
    } else if (user.email?.includes('pa')) {
      userRole = 'pa'
    } else if (r.data?.role) {
      userRole = r.data.role
    }
    setRole(userRole)

    if (supabase) {
      if (!r.data) {
        void supabase.from('user_roles').insert({ user_id: user.id, role: userRole })
      } else if (r.data.role !== userRole) {
        void supabase.from('user_roles').update({ role: userRole }).eq('user_id', user.id)
      }
    }
    if (m.data) setJoined(m.data.map(x => x.activity_id))
    setTeamIds(ownTeams)
    if (ma.data) {
      setMyActivities(ma.data.map((x: any) => ({
        id: x.id,
        title: x.title,
        description: x.description,
        category: x.category,
        emoji: x.category === 'Active' ? '🏐' : x.category === 'Food' ? '🧋' : x.category === 'Creative' ? '🎨' : '🃏',
        time: new Date(x.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        starts_at: x.starts_at,  // keep raw for timetable
        ends_at: x.ends_at,       // keep raw for timetable
        location: x.location,
        host: x.profiles?.display_name ?? 'Staff',
        attendees: x.activity_members?.[0]?.count ?? 0,
        capacity: x.capacity,
        accent: '#d8c5ff',
        teamId: x.team_id,
        teamIds: x.team_ids
      })))
    }

    // Set new features states
    if (wl.data) setWaitingList(wl.data)
    if (pl.data) setPolls(pl.data)
    if (vt.data) setMyVotes(vt.data)
    if (ab.data) setMyAbsences(ab.data)
  }

  useEffect(() => {
    void loadLive()
  }, [user])

  const visibleActivities = useMemo(
    () => {
      const now = new Date()
      // Staff see ALL activities (past + future); shads only see upcoming
      const base = (role === 'pa' || role === 'lt')
        ? liveActivities
        : liveActivities.filter(a => new Date((a as any).ends_at ?? 0) >= now)
      return activeFilter === 'All' ? base : base.filter(a => a.category === activeFilter)
    },
    [activeFilter, liveActivities, role]
  )

  if (loading) return <div className="app-loading"><span className="brand-mark"><Send size={20} /></span><p>Getting ShadLoop ready…</p></div>
  if (!user) return <AuthScreen />

  const toggleJoin = async (id: string) => {
    if (!supabase || !user) return
    const activity = liveActivities.find(a => a.id === id)
    if (!activity) return

    const isJoined = joined.includes(id)
    const isWaiting = waitingList.some(w => w.activity_id === id && w.user_id === user.id)

    if (isJoined) {
      // Leave activity
      await supabase.from('activity_members').delete().eq('activity_id', id).eq('user_id', user.id)
      
      // Automatic waitlist promotion
      const actWaitlist = waitingList.filter(w => w.activity_id === id).sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
      if (actWaitlist.length > 0) {
        const nextUser = actWaitlist[0]
        await supabase.from('activity_waiting_list').delete().eq('id', nextUser.id)
        await supabase.from('activity_members').insert({ activity_id: id, user_id: nextUser.user_id })
        sendPushNotification('Waitlist Promotion! 🎉', `You are now joined in "${activity.title}"!`)
      }
    } else if (isWaiting) {
      // Leave waiting list
      await supabase.from('activity_waiting_list').delete().eq('activity_id', id).eq('user_id', user.id)
    } else {
      // Join activity or waiting list depending on capacity
      if (activity.attendees >= activity.capacity) {
        await supabase.from('activity_waiting_list').insert({ activity_id: id, user_id: user.id })
      } else {
        await supabase.from('activity_members').insert({ activity_id: id, user_id: user.id })
      }
    }
    await loadLive()
  }

  const handleCastVote = async (pollId: string, optionIndex: number) => {
    if (!supabase || !user) return
    const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex })
    if (!error) {
      await loadLive()
    }
  }

  const handleReportAbsence = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase || !user) return
    const f = new FormData(e.currentTarget)
    const { error } = await supabase.from('attendance_reports').insert({
      user_id: user.id,
      type: f.get('type'),
      reason: f.get('reason'),
      starts_at: f.get('starts'),
      notes: f.get('notes')
    })
    
    setAbsenceMessage(error?.message ?? 'Report submitted successfully. Awaiting staff review.')
    if (!error) {
      e.currentTarget.reset()
      await loadLive()
    }
  }

  const getPollVotesCount = (pollId: string, optIdx: number) => {
    // Standard mock or query filtering for poll votes count
    // Real schema has poll_votes referencing polls.
    // If supabase doesn't have poll_votes aggregation in client yet, we can filter locally.
    // In our migration, poll_votes contains poll_id, user_id, option_index
    // But since we just fetched all poll_votes as vt, we can count:
    // To simplify: we can count votes on the database via a count query or aggregate
    // Let's count locally from our loaded lists
    return polls.find(p => p.id === pollId)?.poll_votes?.filter((v: any) => v.option_index === optIdx).length ?? 0
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ShadLoop home">
          <span className="brand-mark" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="S" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </span>
          <span>shad<span>loop</span></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <button className={view === 'discover' ? 'active' : ''} onClick={() => setView('discover')}><Compass size={18} /> Discover</button>
          <button className={view === 'plans' ? 'active' : ''} onClick={() => setView('plans')}><CalendarDays size={18} /> My plans</button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><MapPin size={18} /> Map</button>
          <button className={view === 'polls' ? 'active' : ''} onClick={() => setView('polls')}><BarChart3 size={18} /> Surveys</button>
          <button className={view === 'absences' ? 'active' : ''} onClick={() => setView('absences')}><AlertCircle size={18} /> Absences</button>
        </nav>
        <div className="header-actions">
          {role !== 'shad' && (
            <>
              <button className="create-activity-button-header" onClick={() => setComposerOpen(true)}>
                <Plus size={16} /> Create Activity
              </button>
              <button className="staff-button" onClick={() => setStaffOpen(true)}>
                <ShieldCheck size={17} /> Staff
              </button>
            </>
          )}
          <button className="icon-button notification-trigger" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <Bell size={20} />
            {announcements.length > 0 && <i>{announcements.length}</i>}
          </button>
          <button className="avatar" aria-label="Open profile" onClick={() => setProfileOpen(true)}>
            {(user.user_metadata.display_name || user.email || 'ME').slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>

      {notificationsOpen && (
        <aside className="notification-center">
          <div className="panel-header">
            <h3>Announcements Center</h3>
            <button onClick={() => setNotificationsOpen(false)}>×</button>
          </div>
          {announcements.map(a => (
            <article key={a.id} className={`notice ${a.priority}`}>
              <strong>{a.title}</strong>
              <span>{a.body}</span>
            </article>
          ))}
          {announcements.length === 0 && <p className="empty-message">No announcements yet.</p>}
        </aside>
      )}

      <main id="top">
        {view === 'map' && (
          <section className="plans-page">
            <p className="eyebrow">Interactive Campus Map</p>
            <h1>Where is the <em>move?</em></h1>
            <InteractiveMap 
              selectedLocation={selectedMapLocation}
              onSelectLocation={setSelectedMapLocation}
              activities={liveActivities}
            />
          </section>
        )}

        {view === 'polls' && (
          <section className="plans-page">
            <p className="eyebrow">Cohort Polls & Surveys</p>
            <h1>Student <em>Voice</em></h1>
            <div className="plans-layout" style={{ gridTemplateColumns: '1fr' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {polls.map(poll => {
                  const voteForPoll = myVotes.find(v => v.poll_id === poll.id)
                  const hasVoted = !!voteForPoll
                  const isExpired = new Date(poll.expires_at).getTime() < Date.now()
                  
                  // Compute total votes
                  const votesList = poll.poll_votes ?? []
                  const totalVotes = votesList.length

                  return (
                    <div key={poll.id} className="poll-card" style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
                      <p className="eyebrow" style={{ fontSize: '10px' }}>
                        Created by {poll.profiles?.display_name} {isExpired && '· Expired'}
                      </p>
                      <h3 style={{ fontSize: '20px', margin: '6px 0 16px' }}>{poll.question}</h3>
                      
                      <div className="poll-options">
                        {poll.options.map((opt: string, idx: number) => {
                          const optionVotes = votesList.filter((v: any) => v.option_index === idx).length
                          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0
                          const isUserSelection = voteForPoll?.option_index === idx

                          return (
                            <div 
                              key={idx} 
                              className={`poll-option-row ${hasVoted ? 'voted' : ''} ${isUserSelection ? 'selected' : ''}`}
                              onClick={() => !hasVoted && !isExpired && handleCastVote(poll.id, idx)}
                            >
                              {(hasVoted || isExpired) && (
                                <div className="poll-option-bg" style={{ width: `${percentage}%` }} />
                              )}
                              <span>{opt}</span>
                              {(hasVoted || isExpired) && (
                                <span style={{ zIndex: 2 }}>{percentage}% ({optionVotes})</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', textAlign: 'right' }}>
                        Total votes: {totalVotes}
                      </p>
                    </div>
                  )
                })}
                {polls.length === 0 && (
                  <div className="empty-state">
                    <span>📊</span>
                    <h3>No active surveys</h3>
                    <p>PAs and LTs will publish surveys to coordinate dinner, trips, or games here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'absences' && (
          <section className="plans-page">
            <p className="eyebrow">Absence and Lateness Portal</p>
            <h1>Report <em>excuse</em></h1>
            
            <div className="plans-layout">
              <div>
                <h2>File a new report</h2>
                <form className="profile-form" onSubmit={handleReportAbsence} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--line)' }}>
                  <label>Type
                    <select name="type" required>
                      <option value="absence">Absence (Full activity block)</option>
                      <option value="lateness">Lateness (Arriving late)</option>
                    </select>
                  </label>
                  <label>Reason
                    <input name="reason" required placeholder="e.g. Doctor appointment, feeling unwell, team project" />
                  </label>
                  <label>Datetime
                    <input type="datetime-local" name="starts" required />
                  </label>
                  <label>Additional Notes
                    <textarea name="notes" rows={3} placeholder="Provide any details for the Lead Team..." />
                  </label>
                  <button className="auth-submit">Submit Report</button>
                  {absenceMessage && <p className="form-message">{absenceMessage}</p>}
                </form>
              </div>

              <div>
                <h2>My reports status</h2>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {myAbsences.map(rep => (
                    <div key={rep.id} className="report-row">
                      <div className="report-info">
                        <strong>{rep.type === 'absence' ? 'Absence' : 'Lateness'}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{rep.reason}</span>
                      </div>
                      <span className={`status-badge status-${rep.status}`}>{rep.status}</span>
                    </div>
                  ))}
                  {myAbsences.length === 0 && <p className="empty-message">No absence reports submitted.</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'plans' && (
          <section className="plans-page">
            <p className="eyebrow">Your schedule</p>
            <h1>My <em>plans</em></h1>

            {(() => {
              // Merge activities + official schedule events into one timeline
              type TItem = { id: string; title: string; time: Date; end: Date; location?: string; kind: 'activity' | 'official'; category?: string; host?: string }
              const items: TItem[] = [
                ...myActivities.map(a => ({
                  id: a.id, title: a.title,
                  time: new Date((a as any).starts_at ?? Date.now()),
                  end: new Date((a as any).ends_at ?? Date.now()),
                  location: a.location, kind: 'activity' as const,
                  category: a.category, host: a.host
                })),
                ...schedule.map((e: any) => ({
                  id: e.id, title: e.title,
                  time: new Date(e.starts_at),
                  end: new Date(e.ends_at ?? e.starts_at),
                  location: e.location, kind: 'official' as const
                }))
              ].sort((a, b) => a.time.getTime() - b.time.getTime())

              // Group by date
              const byDay = new Map<string, TItem[]>()
              for (const item of items) {
                const key = item.time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
                if (!byDay.has(key)) byDay.set(key, [])
                byDay.get(key)!.push(item)
              }

              const catColor: Record<string, string> = { Active: '#a855f7', Food: '#f97316', Creative: '#ec4899', Chill: '#06b6d4' }

              if (items.length === 0) return (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                  <h3 style={{ color: 'var(--muted)', fontWeight: 600 }}>No activities yet</h3>
                  <p style={{ color: 'var(--muted)' }}>Join activities from Discover or ask your PA/LT to create some!</p>
                </div>
              )

              return (
                <div className="timetable">
                  {Array.from(byDay.entries()).map(([day, dayItems]) => (
                    <div key={day} className="timetable-day">
                      <div className="timetable-day-label">
                        <span>{day}</span>
                      </div>
                      <div className="timetable-rows">
                        {dayItems.map(item => {
                          const color = item.kind === 'official' ? '#6366f1' : (catColor[item.category ?? ''] ?? '#7c3aed')
                          const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          return (
                            <div key={item.id} className="timetable-row" style={{ '--accent': color } as any}>
                              <div className="timetable-time">
                                <span>{fmt(item.time)}</span>
                                <span className="timetable-end">{fmt(item.end)}</span>
                              </div>
                              <div className="timetable-dot" />
                              <div className="timetable-content">
                                <div className="timetable-tag" style={{ background: color + '20', color }}>
                                  {item.kind === 'official' ? '📋 Official' : `${item.category ?? 'Activity'}`}
                                </div>
                                <strong className="timetable-title">{item.title}</strong>
                                {item.location && <span className="timetable-loc">📍 {item.location}</span>}
                                {item.host && item.kind === 'activity' && <span className="timetable-loc">👤 {item.host}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </section>
        )}

        {view === 'discover' && (
          <>
            {(announcements.length > 0 || schedule.length > 0) && (
              <section className="live-info">
                <div>
                  <p className="eyebrow">Latest announcements</p>
                  {announcements.slice(0, 3).map(a => (
                    <article key={a.id} className={`notice ${a.priority}`}>
                      <strong>{a.title}</strong>
                      <span>{a.body}</span>
                    </article>
                  ))}
                </div>
                <div>
                  <p className="eyebrow">Coming up</p>
                  {schedule.slice(0, 3).map(e => (
                    <article key={e.id} className="schedule-row">
                      <time>{new Date(e.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      <div>
                        <strong>{e.title}</strong>
                        <span>{e.location}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            
            <section className="hero">
              <div className="hero-copy">
                <p className="overline"><span /> Free time until 7:00 PM</p>
                <h1>What’s the <em>move?</em></h1>
                <p>Find your people, try something new, and make every free block count on ShadLoop.</p>
              </div>
              {role !== 'shad' && <button className="create-button" onClick={() => setComposerOpen(true)}><Plus size={20} /> Create an activity</button>}
            </section>

            <section className="ai-prompt" aria-label="Message your PA/LT">
              <div className="ai-icon"><Send size={22} /></div>
              <div style={{ flex: 1 }}>
                <label htmlFor="wish-input">Tell us what you feel like doing</label>
                <p>Your message goes directly to your PA and LT</p>
              </div>
              <div className="search-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <input
                  id="wish-input"
                  placeholder="I want to…"
                  value={wishMessage}
                  onChange={e => { setWishMessage(e.target.value); setWishSent(false) }}
                />
                <button
                  disabled={!wishMessage.trim() || wishSent}
                  aria-label="Send message to staff"
                  style={{ borderRadius: '12px', padding: '10px 18px', background: wishSent ? '#22c55e' : 'var(--gradient-primary)', color: 'white', border: 'none', fontWeight: 700, cursor: wishSent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                  onClick={async () => {
                    if (!supabase || !user || !wishMessage.trim()) return
                    const { error: wishErr } = await supabase
                      .from('shad_wishes')
                      .insert({ user_id: user.id, prompt: wishMessage.trim() })
                    if (wishErr) {
                      console.error('Wish insert failed:', wishErr)
                      alert(`Could not send message: ${wishErr.message}`)
                    } else {
                      setWishSent(true)
                      setWishMessage('')
                    }
                  }}
                >
                  {wishSent ? <><CheckCircle size={16} /> Sent to staff!</> : <><Send size={16} /> Send to PA/LT</>}
                </button>
              </div>
            </section>

            <section className="discover-section" id="discover">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Happening around you</p>
                  <h2>Jump into something</h2>
                </div>
                <div className="filters" aria-label="Filter activities">
                  {filters.map(filter => (
                    <button 
                      key={filter} 
                      className={filter === activeFilter ? 'active' : ''} 
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {teamIds.length > 0 && liveActivities.some(a => (a.teamId && teamIds.includes(a.teamId)) || (a.teamIds && a.teamIds.some(tid => teamIds.includes(tid)))) && (
                <div className="team-now">
                  <p className="eyebrow">Your teams right now</p>
                  {liveActivities.filter(a => (a.teamId && teamIds.includes(a.teamId)) || (a.teamIds && a.teamIds.some(tid => teamIds.includes(tid)))).map(a => (
                    <span key={a.id}><strong>{a.title}</strong> · {a.location} · {a.time}</span>
                  ))}
                </div>
              )}
              
              <div className="activity-grid" aria-label="Drag activities to reorder them">
                {visibleActivities.map(activity => {
                  const isWaitlist = waitingList.some(w => w.activity_id === activity.id && w.user_id === user.id)
                  
                  return (
                    <div 
                      key={activity.id} 
                      draggable 
                      onDragStart={() => setDragged(activity.id)} 
                      onDragOver={e => e.preventDefault()} 
                      onDrop={() => {
                        if (!dragged || dragged === activity.id) return
                        setLiveActivities(cur => {
                          const copy = [...cur]
                          const from = copy.findIndex(x => x.id === dragged)
                          const to = copy.findIndex(x => x.id === activity.id)
                          const [item] = copy.splice(from, 1)
                          copy.splice(to, 0, item)
                          return copy
                        })
                        setDragged(null)
                      }}
                    >
                      <ActivityCard 
                        activity={activity} 
                        joined={joined.includes(activity.id)} 
                        waiting={isWaitlist}
                        onJoin={toggleJoin} 
                      />
                    </div>
                  )
                })}
                {visibleActivities.length === 0 && (
                  <div className="empty-state">
                    <span>✨</span>
                    <h3>No activities here yet</h3>
                    <p>Be the first to create a real plan.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={view === 'discover' ? 'mobile-profile active' : ''} onClick={() => setView('discover')}><Compass size={21} /><span>Discover</span></button>
        <button className={view === 'plans' ? 'mobile-profile active' : ''} onClick={() => setView('plans')}><CalendarDays size={21} /><span>My plans</span></button>
        {role !== 'shad' ? (
          <button onClick={() => setComposerOpen(true)}><Plus size={24} aria-label="Create activity" /></button>
        ) : (
          <span />
        )}
        <button className={view === 'map' ? 'mobile-profile active' : ''} onClick={() => setView('map')}><MapPin size={21} /><span>Map</span></button>
        <button className="mobile-profile" onClick={() => setProfileOpen(true)}><UserRound size={21} /><span>Profile</span></button>
      </nav>

      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
      {staffOpen && user && role !== 'shad' && (
        <StaffDashboard 
          userId={user.id} 
          role={role} 
          onClose={() => setStaffOpen(false)} 
          onSaved={() => void loadLive()} 
        />
      )}
      {composerOpen && user && role !== 'shad' && (
        <ActivityComposer 
          userId={user.id} 
          onClose={() => setComposerOpen(false)} 
          onSaved={() => void loadLive()} 
        />
      )}
    </div>
  )
}
