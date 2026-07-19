/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type FormEvent } from 'react'
import { Megaphone, X, CalendarPlus, QrCode, ClipboardList, BarChart3, Users, ShieldAlert, Check, Ban, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function StaffDashboard({ userId, role, onClose, onSaved }: { userId:string; role:'pa'|'lt'; onClose:()=>void; onSaved:()=>void }) {
  const [tab, setTab] = useState<'schedule' | 'announcement' | 'qr' | 'absences' | 'polls' | 'waiting' | 'teams' | 'roles'>('schedule')
  const [message, setMessage] = useState('')
  const [teams, setTeams] = useState<any[]>([])
  const [pas, setPas] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  
  // Specific data for features
  const [absences, setAbsences] = useState<any[]>([])
  const [polls, setPolls] = useState<any[]>([])
  const [waitlists, setWaitlists] = useState<any[]>([])
  const [selectedActivity, setSelectedActivity] = useState<string>('')
  const [selectedUserManual, setSelectedUserManual] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [activityMembers, setActivityMembers] = useState<any[]>([])

  useEffect(() => {
    if (!supabase) return
    
    // Load general requirements
    void Promise.all([
      supabase.from('teams').select('id,name,kind').order('kind').order('name'),
      supabase.from('user_roles').select('user_id,profiles(display_name)').eq('role', 'pa'),
      supabase.from('profiles').select('id,display_name').order('display_name'),
      supabase.from('activities').select('id,title,capacity').gte('ends_at', new Date().toISOString())
    ]).then(([t, p, pr, a]) => {
      setTeams(t.data ?? [])
      setPas(p.data ?? [])
      setProfiles(pr.data ?? [])
      setActivities(a.data ?? [])
      if (a.data && a.data.length > 0) {
        setSelectedActivity(a.data[0].id)
      }
    })
  }, [role])

  // Reload tab-specific data
  useEffect(() => {
    if (!supabase) return
    if (tab === 'absences') {
      void supabase.from('attendance_reports').select('*, profiles:user_id(display_name)').order('created_at', { ascending: false })
        .then(({ data }) => setAbsences(data ?? []))
    } else if (tab === 'polls') {
      void supabase.from('polls').select('*, profiles:created_by(display_name)').order('created_at', { ascending: false })
        .then(({ data }) => setPolls(data ?? []))
    } else if (tab === 'waiting') {
      void supabase.from('activities').select('id,title,capacity,activity_waiting_list(*,profiles:user_id(display_name))')
        .then(({ data }) => setWaitlists(data ?? []))
    }
  }, [tab])

  // Load activity members for check-in view
  useEffect(() => {
    if (!supabase || !selectedActivity) return
    void supabase.from('activity_members').select('*, profiles:user_id(display_name)').eq('activity_id', selectedActivity)
      .then(({ data }) => setActivityMembers(data ?? []))
  }, [selectedActivity])

  const handleApproveAbsence = async (id: string, approve: boolean) => {
    if (!supabase) return
    const status = approve ? 'approved' : 'rejected'
    const { error } = await supabase.from('attendance_reports').update({ status }).eq('id', id)
    if (!error) {
      setAbsences(cur => cur.map(a => a.id === id ? { ...a, status } : a))
      setMessage(approve ? 'Absence approved.' : 'Absence rejected.')
    } else {
      setMessage(error.message)
    }
  }

  const handlePromoteFromWaitlist = async (waitlistId: string, activityId: string, profileId: string) => {
    if (!supabase) return
    // Remove from waitlist
    await supabase.from('activity_waiting_list').delete().eq('id', waitlistId)
    // Add to members
    const { error } = await supabase.from('activity_members').insert({ activity_id: activityId, user_id: profileId })
    if (!error) {
      setMessage('Participant promoted to joined list!')
      // Refresh waitlists
      const { data } = await supabase.from('activities').select('id,title,capacity,activity_waiting_list(*,profiles:user_id(display_name))')
      setWaitlists(data ?? [])
    } else {
      setMessage(error.message)
    }
  }

  const handleCreatePoll = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    const f = new FormData(e.currentTarget)
    const options = [
      f.get('opt1')?.toString().trim(),
      f.get('opt2')?.toString().trim(),
      f.get('opt3')?.toString().trim(),
      f.get('opt4')?.toString().trim()
    ].filter(Boolean) as string[]

    const expiresAt = new Date(Date.now() + Number(f.get('duration')) * 60000).toISOString()
    const { error } = await supabase.from('polls').insert({
      question: f.get('question'),
      options,
      created_by: userId,
      expires_at: expiresAt
    })
    
    setMessage(error?.message ?? 'Poll published.')
    if (!error) {
      e.currentTarget.reset()
      // Refresh polls
      const { data } = await supabase.from('polls').select('*, profiles:created_by(display_name)').order('created_at', { ascending: false })
      setPolls(data ?? [])
    }
  }

  const handleCheckInUser = async (profileId: string) => {
    if (!supabase || !selectedActivity) return
    const { error } = await supabase.from('activity_members').update({ confirmed_at: new Date().toISOString() })
      .eq('activity_id', selectedActivity).eq('user_id', profileId)

    if (error) {
      // If not a member, try to add them and confirm
      const { error: insErr } = await supabase.from('activity_members').insert({
        activity_id: selectedActivity,
        user_id: profileId,
        confirmed_at: new Date().toISOString()
      })
      setMessage(insErr?.message ?? 'Checked in successfully (added to activity).')
    } else {
      setMessage('Checked in successfully.')
    }
    
    // Refresh members list
    const { data } = await supabase.from('activity_members').select('*, profiles:user_id(display_name)').eq('activity_id', selectedActivity)
    setActivityMembers(data ?? [])
  }

  const handleSimulateQRScan = () => {
    if (!selectedUserManual) return
    setScanning(true)
    setScanResult('Scanning...')
    setTimeout(() => {
      setScanning(false)
      const userObj = profiles.find(p => p.id === selectedUserManual)
      setScanResult(`Scanned user: ${userObj?.display_name}`)
      void handleCheckInUser(selectedUserManual)
    }, 1500)
  }

  const handleUpdateRole = async (targetUserId: string, newRole: 'shad' | 'pa' | 'lt') => {
    if (!supabase) return
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', targetUserId)
    setMessage(error?.message ?? `Role updated to ${newRole.toUpperCase()}.`)
    if (!error) {
      // Update local profiles list if necessary, or reload roles
    }
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    const f = new FormData(e.currentTarget)
    setMessage('Saving…')
    const result = tab === 'schedule'
      ? await supabase.from('schedule_events').insert({
          title: f.get('title'),
          description: f.get('body'),
          location: f.get('location'),
          starts_at: f.get('starts'),
          ends_at: f.get('ends'),
          audience: f.get('audience'),
          created_by: userId
        })
      : await supabase.from('announcements').insert({
          title: f.get('title'),
          body: f.get('body'),
          priority: f.get('priority'),
          audience: f.get('audience'),
          created_by: userId
        })
    setMessage(result.error?.message ?? 'Published.')
    if (!result.error) {
      e.currentTarget.reset()
      onSaved()
    }
  }

  return (
    <div className="panel-backdrop">
      <aside className="profile-panel staff-panel" style={{ width: 'min(100%, 650px)' }}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">PA / LT Dashboard</p>
            <h2>Staff controls</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="auth-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '16px', overflowX: 'auto', display: 'flex', whiteSpace: 'nowrap', padding: '4px' }}>
          <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}><CalendarPlus size={15} /> Agenda</button>
          <button className={tab === 'announcement' ? 'active' : ''} onClick={() => setTab('announcement')}><Megaphone size={15} /> News</button>
          <button className={tab === 'qr' ? 'active' : ''} onClick={() => setTab('qr')}><QrCode size={15} /> QR Attendance</button>
          <button className={tab === 'absences' ? 'active' : ''} onClick={() => setTab('absences')}><ClipboardList size={15} /> Absences</button>
          <button className={tab === 'polls' ? 'active' : ''} onClick={() => setTab('polls')}><BarChart3 size={15} /> Surveys</button>
          <button className={tab === 'waiting' ? 'active' : ''} onClick={() => setTab('waiting')}><Users size={15} /> Waitlist</button>
          {role === 'lt' && <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}><ShieldAlert size={15} /> PA Teams</button>}
          {role === 'lt' && <button className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}><ShieldAlert size={15} /> Roles</button>}
        </div>

        {/* Tab Contents */}
        {tab === 'teams' && role === 'lt' && (
          <form className="profile-form staff-form" onSubmit={async e => {
            e.preventDefault()
            if (!supabase) return
            const f = new FormData(e.currentTarget)
            const { error } = await supabase.from('team_pa_assignments').upsert({
              team_id: f.get('team'),
              pa_user_id: f.get('pa'),
              assigned_by: userId
            })
            setMessage(error?.message ?? 'PA assigned.')
          }}>
            <label>Team
              <select name="team">
                {teams.map(t => <option key={t.id} value={t.id}>{t.kind === 'house' ? 'House' : 'Design'} — {t.name}</option>)}
              </select>
            </label>
            <label>PA
              <select name="pa">
                {pas.map(p => <option key={p.user_id} value={p.user_id}>{p.profiles?.display_name}</option>)}
              </select>
            </label>
            <button className="auth-submit">Assign PA</button>
            {message && <p className="form-message">{message}</p>}
          </form>
        )}

        {tab === 'roles' && role === 'lt' && (
          <div className="staff-form" style={{ display: 'grid', gap: '14px' }}>
            <h3>Manage Cohort Roles</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '12px', background: 'white', padding: '8px' }}>
              {profiles.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
                  <strong>{p.display_name}</strong>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="join-button" onClick={() => void handleUpdateRole(p.id, 'shad')} style={{ fontSize: '10px', padding: '4px 8px' }}>SHAD</button>
                    <button className="join-button" onClick={() => void handleUpdateRole(p.id, 'pa')} style={{ fontSize: '10px', padding: '4px 8px', background: '#daf3e6', color: '#206548' }}>PA</button>
                    <button className="join-button" onClick={() => void handleUpdateRole(p.id, 'lt')} style={{ fontSize: '10px', padding: '4px 8px', background: '#ffebcc', color: '#8a4e16' }}>LT</button>
                  </div>
                </div>
              ))}
            </div>
            {message && <p className="form-message">{message}</p>}
          </div>
        )}

        {tab === 'qr' && (
          <div className="staff-form" style={{ display: 'grid', gap: '16px' }}>
            <h3>QR Code Attendance Check-in</h3>
            <label>Select Activity
              <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)}>
                {activities.map(act => <option key={act.id} value={act.id}>{act.title}</option>)}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <label>Select Participant
                <select value={selectedUserManual} onChange={e => setSelectedUserManual(e.target.value)}>
                  <option value="">-- Choose student --</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="auth-submit" onClick={() => handleCheckInUser(selectedUserManual)} disabled={!selectedUserManual} style={{ flexGrow: 1, padding: '12px' }}>
                  Check In
                </button>
                <button className="auth-submit" onClick={handleSimulateQRScan} disabled={!selectedUserManual} style={{ background: '#319caa', padding: '12px' }} title="Simulate Camera Scan">
                  <Play size={16} /> Scan
                </button>
              </div>
            </div>

            {scanning && (
              <div className="qr-scanner-box">
                <div className="qr-scanner-overlay" />
                <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, textAlign: 'center', color: 'white', fontWeight: 600, fontSize: '12px' }}>
                  Align participant's personal QR code in frame...
                </div>
              </div>
            )}
            
            {scanResult && <p style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--purple)' }}>{scanResult}</p>}

            <div>
              <h4>Attendees Confirmed ({activityMembers.filter(m => m.confirmed_at).length}):</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'white', borderRadius: '12px', border: '1px solid var(--line)', padding: '6px' }}>
                {activityMembers.map(m => (
                  <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--line)', fontSize: '12px' }}>
                    <span>{m.profiles?.display_name || 'Participant'}</span>
                    {m.confirmed_at ? (
                      <span style={{ color: '#246b49', fontWeight: 700 }}>✓ Present</span>
                    ) : (
                      <button className="join-button" onClick={() => handleCheckInUser(m.user_id)} style={{ fontSize: '9px', padding: '2px 6px' }}>Mark Present</button>
                    )}
                  </div>
                ))}
                {activityMembers.length === 0 && <p className="empty-message" style={{ padding: '12px' }}>No members registered for this activity.</p>}
              </div>
            </div>
            {message && <p className="form-message">{message}</p>}
          </div>
        )}

        {tab === 'absences' && (
          <div className="staff-form" style={{ display: 'grid', gap: '16px' }}>
            <h3>Absences and Latenesses Approval</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gap: '10px' }}>
              {absences.map(rep => (
                <div key={rep.id} className="report-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{rep.profiles?.display_name}</strong>
                      <span className={`status-badge status-${rep.status}`} style={{ marginLeft: '8px' }}>{rep.status}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {new Date(rep.starts_at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: '0', fontSize: '13px' }}><strong>Reason:</strong> {rep.reason}</p>
                  {rep.notes && <p style={{ margin: '0', fontSize: '12px', color: 'var(--muted)' }}><strong>Notes:</strong> {rep.notes}</p>}
                  
                  {rep.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button className="join-button joined" onClick={() => handleApproveAbsence(rep.id, true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}>
                        <Check size={14} /> Approve
                      </button>
                      <button className="join-button" onClick={() => handleApproveAbsence(rep.id, false)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fce8e6', color: '#a04444', padding: '6px 12px' }}>
                        <Ban size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {absences.length === 0 && <p className="empty-state">No absences or lateness reports filed yet.</p>}
            </div>
            {message && <p className="form-message">{message}</p>}
          </div>
        )}

        {tab === 'polls' && (
          <div className="staff-form" style={{ display: 'grid', gap: '16px' }}>
            <h3>Create a Survey / Poll</h3>
            <form className="profile-form" onSubmit={handleCreatePoll}>
              <label>Survey Question
                <input name="question" required placeholder="What movie should we watch tonight?" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>Option 1<input name="opt1" required placeholder="Movie A" /></label>
                <label>Option 2<input name="opt2" required placeholder="Movie B" /></label>
                <label>Option 3<input name="opt3" placeholder="Movie C (Optional)" /></label>
                <label>Option 4<input name="opt4" placeholder="Movie D (Optional)" /></label>
              </div>
              <label>Duration (Minutes)
                <input type="number" name="duration" min="5" max="1440" defaultValue="60" required />
              </label>
              <button className="auth-submit">Publish Survey</button>
            </form>

            <h4 style={{ marginTop: '20px' }}>Active & Past Surveys:</h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'grid', gap: '12px' }}>
              {polls.map(poll => (
                <div key={poll.id} className="poll-card" style={{ background: '#faf9fb' }}>
                  <strong>{poll.question}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 10px' }}>
                    Created by {poll.profiles?.display_name} · Expires {new Date(poll.expires_at).toLocaleTimeString()}
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {poll.options.map((opt: string, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', border: '1px solid var(--line)', borderRadius: '6px', background: 'white' }}>
                        <span>{opt}</span>
                        {/* We will show total votes simplified on staff dashboard */}
                        <strong>Option {idx+1}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {message && <p className="form-message">{message}</p>}
          </div>
        )}

        {tab === 'waiting' && (
          <div className="staff-form" style={{ display: 'grid', gap: '16px' }}>
            <h3>Activity Waiting Lists</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gap: '14px' }}>
              {waitlists.map(act => (
                <div key={act.id} style={{ padding: '14px', background: 'white', border: '1px solid var(--line)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{act.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 700 }}>
                      Waitlist ({act.activity_waiting_list?.length ?? 0} queued)
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {act.activity_waiting_list?.map((w: any, index: number) => (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#faf9fb', borderRadius: '6px', fontSize: '12px' }}>
                        <span>{index + 1}. {w.profiles?.display_name || 'Participant'}</span>
                        <button 
                          className="join-button joined" 
                          onClick={() => handlePromoteFromWaitlist(w.id, act.id, w.user_id)}
                          style={{ fontSize: '10px', padding: '2px 8px' }}
                        >
                          Promote to Joined
                        </button>
                      </div>
                    ))}
                    {(!act.activity_waiting_list || act.activity_waiting_list.length === 0) && (
                      <p className="empty-message" style={{ fontSize: '11px', margin: 0 }}>No participants on the waiting list.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {message && <p className="form-message">{message}</p>}
          </div>
        )}

        {/* Existing Agenda and News panels */}
        {(tab === 'schedule' || tab === 'announcement') && (
          <form className="profile-form staff-form" onSubmit={submit}>
            <label>Title<input name="title" required maxLength={100} /></label>
            <label>{tab === 'schedule' ? 'Description' : 'Message'}<textarea name="body" required rows={4} maxLength={600} /></label>
            
            {tab === 'schedule' && (
              <>
                <label>Location<input name="location" required /></label>
                <div className="form-row">
                  <label>Starts<input name="starts" type="datetime-local" required /></label>
                  <label>Ends<input name="ends" type="datetime-local" required /></label>
                </div>
              </>
            )}
            
            {tab === 'announcement' && (
              <label>Priority
                <select name="priority">
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            )}
            
            <label>Audience
              <select name="audience">
                <option value="all">Everyone</option>
                <option value="shad">SHAD</option>
                <option value="pa">PA</option>
                <option value="lt">LT</option>
              </select>
            </label>
            
            <button className="auth-submit">Publish</button>
            {message && <p className="form-message">{message}</p>}
          </form>
        )}
      </aside>
    </div>
  )
}
