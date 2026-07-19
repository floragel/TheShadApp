import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
