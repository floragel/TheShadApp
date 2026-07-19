export type ActivityCategory = 'Active' | 'Chill' | 'Food' | 'Creative'

export interface Activity {
  id: string
  title: string
  description: string
  category: ActivityCategory
  emoji: string
  time: string
  location: string
  host: string
  attendees: number
  capacity: number
  accent: string
}
