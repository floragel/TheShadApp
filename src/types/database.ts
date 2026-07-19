export type TeamKind = 'house' | 'design'

export interface Team {
  id: string
  name: string
  kind: TeamKind
  color: string
}

export interface Profile {
  id: string
  display_name: string
  bio: string
  created_at: string
  updated_at: string
}

export interface TeamMembership {
  user_id: string
  team_id: string
  team_kind?: TeamKind
  team?: Team
}
