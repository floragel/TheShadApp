import { Clock3, MapPin, Users } from 'lucide-react'
import type { Activity } from '../types/activity'

interface ActivityCardProps {
  activity: Activity
  joined: boolean
  waiting?: boolean
  onJoin: (id: string) => void
}

export function ActivityCard({ activity, joined, waiting = false, onJoin }: ActivityCardProps) {
  const attendeeCount = activity.attendees + (joined ? 1 : 0)
  const isFull = activity.attendees >= activity.capacity

  return (
    <article className="activity-card">
      <div className="activity-visual" style={{ background: activity.accent }}>
        <span aria-hidden="true">{activity.emoji}</span>
        <div className="category-pill">{activity.category}</div>
      </div>
      <div className="activity-content">
        <div>
          <p className="eyebrow">Hosted by {activity.host}</p>
          <h3>{activity.title}</h3>
          <p className="description">{activity.description}</p>
        </div>
        <div className="activity-meta">
          <span><Clock3 size={15} />{activity.time}</span>
          <span><MapPin size={15} />{activity.location}</span>
        </div>
        <div className="card-footer">
          <div style={{ display: 'grid', gap: '4px' }}>
            <span className="capacity"><Users size={17} /> {attendeeCount}/{activity.capacity} joined</span>
            {waiting && <span className="waitlist-badge">Waiting list</span>}
          </div>
          <button 
            className={joined ? 'join-button joined' : waiting ? 'join-button waiting' : 'join-button'} 
            onClick={() => onJoin(activity.id)}
          >
            {joined ? 'Joined ✓' : waiting ? 'Leave Waitlist' : isFull ? 'Join Waitlist' : 'Join activity'}
          </button>
        </div>
      </div>
    </article>
  )
}
