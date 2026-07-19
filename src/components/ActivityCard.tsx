import { Clock3, MapPin, Users } from 'lucide-react'
import type { Activity } from '../types/activity'

interface ActivityCardProps {
  activity: Activity
  joined: boolean
  onJoin: (id: string) => void
}

export function ActivityCard({ activity, joined, onJoin }: ActivityCardProps) {
  const attendeeCount = activity.attendees + (joined ? 1 : 0)

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
          <span className="capacity"><Users size={17} /> {attendeeCount}/{activity.capacity} joined</span>
          <button className={joined ? 'join-button joined' : 'join-button'} onClick={() => onJoin(activity.id)}>
            {joined ? 'Joined ✓' : 'Join activity'}
          </button>
        </div>
      </div>
    </article>
  )
}
