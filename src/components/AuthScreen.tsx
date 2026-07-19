import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, Mail, Sparkles, UsersRound } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMessage('')

    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          },
        })

    setBusy(false)
    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'sign-up' && !result.data.session) {
      setMessage('Check your inbox to confirm your account, then sign in.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand auth-brand" href="./" aria-label="LinkUp home">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>link<span>up</span></span>
        </a>
        <div>
          <p className="overline"><span /> Built for SHAD</p>
          <h1>Your people.<br /><em>Your free time.</em></h1>
          <p>Join your house and design teams, discover plans, and turn an empty hour into a good memory.</p>
        </div>
        <div className="auth-benefits">
          <span><UsersRound size={18} /> Find your teams</span>
          <span><LockKeyhole size={18} /> Private to signed-in participants</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Account action">
            <button className={mode === 'sign-in' ? 'active' : ''} onClick={() => setMode('sign-in')}>Sign in</button>
            <button className={mode === 'sign-up' ? 'active' : ''} onClick={() => setMode('sign-up')}>Create account</button>
          </div>
          <div className="auth-title">
            <p className="eyebrow">Welcome to LinkUp</p>
            <h2>{mode === 'sign-in' ? 'Good to see you again' : 'Create your account'}</h2>
            <p>{mode === 'sign-in' ? 'Sign in to see what your cohort is planning.' : 'Use an email you can access for verification.'}</p>
          </div>

          {!isSupabaseConfigured ? (
            <div className="setup-notice">
              <LockKeyhole size={22} />
              <div><strong>Database setup required</strong><p>Add the Supabase repository variables described in the README to enable accounts.</p></div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              {mode === 'sign-up' && (
                <label>Full name<input required minLength={2} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nayl Lahlou" /></label>
              )}
              <label>Email address<div className="input-with-icon"><Mail size={18} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
              <label>Password<input required type="password" minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
              {message && <p className="form-message" role="status">{message}</p>}
              <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}<ArrowRight size={18} /></button>
            </form>
          )}
          <p className="security-note"><LockKeyhole size={14} /><span>Passwords are handled by Supabase Auth and never stored by LinkUp.</span></p>
        </div>
      </section>
    </main>
  )
}
