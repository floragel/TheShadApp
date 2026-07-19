import { useMemo, useState } from 'react'
import { Bell, CalendarDays, Compass, Plus, Search, Sparkles, UserRound } from 'lucide-react'
import { ActivityCard } from './components/ActivityCard'
import { AuthScreen } from './components/AuthScreen'
import { ProfilePanel } from './components/ProfilePanel'
import { useAuth } from './context/auth-context'
import { activities } from './data/activities'
import type { ActivityCategory } from './types/activity'
import './styles.css'

const filters: Array<'All' | ActivityCategory> = ['All', 'Active', 'Chill', 'Food', 'Creative']

export default function App() {
  const { user, loading } = useAuth()
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All')
  const [joined, setJoined] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const visibleActivities = useMemo(
    () => activeFilter === 'All' ? activities : activities.filter((activity) => activity.category === activeFilter),
    [activeFilter],
  )

  if (loading) return <div className="app-loading"><span className="brand-mark"><Sparkles size={20} /></span><p>Getting LinkUp ready…</p></div>
  if (!user) return <AuthScreen />

  const toggleJoin = (id: string) => {
    setJoined((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
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
          <button className="icon-button" aria-label="Notifications"><Bell size={20} /></button>
          <button className="avatar" aria-label="Open profile" onClick={() => setProfileOpen(true)}>{(user.user_metadata.display_name || user.email || 'ME').slice(0, 2).toUpperCase()}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="overline"><span /> Free time until 7:00 PM</p>
            <h1>What’s the <em>move?</em></h1>
            <p>Find your people, try something new, and make every free block count.</p>
          </div>
          <button className="create-button"><Plus size={20} /> Create an activity</button>
        </section>

        <section className="ai-prompt" aria-label="AI activity finder">
          <div className="ai-icon"><Sparkles size={22} /></div>
          <div>
            <label htmlFor="activity-search">Tell us what you feel like doing</label>
            <p>Try “something active with new people for 30 minutes”</p>
          </div>
          <div className="search-box">
            <input id="activity-search" placeholder="I want to…" />
            <button aria-label="Find activities"><Search size={19} /></button>
          </div>
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
              <div className="empty-state"><span>🎨</span><h3>No creative plans yet</h3><p>Be the first to start one.</p></div>
            )}
          </div>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className="active" href="#discover"><Compass size={21} /><span>Discover</span></a>
        <a href="#schedule"><CalendarDays size={21} /><span>My plans</span></a>
        <button><Plus size={24} aria-label="Create activity" /></button>
        <a href="#search"><Search size={21} /><span>Search</span></a>
        <button className="mobile-profile" onClick={() => setProfileOpen(true)}><UserRound size={21} /><span>Profile</span></button>
      </nav>
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
