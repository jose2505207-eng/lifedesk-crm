// AuthScreen.jsx — Pantalla de login / sign up para LifeDesk
import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState('login')   // 'login' | 'signup' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)       // { type: 'error'|'ok', text }
  const [lang, setLang]       = useState('es')

  const t = {
    es: {
      title:        'LifeDesk',
      sub:          'CRM para agentes de seguros de vida',
      email:        'Correo electrónico',
      password:     'Contraseña',
      login:        'Iniciar sesión',
      signup:       'Crear cuenta',
      reset:        'Recuperar contraseña',
      noAccount:    '¿No tienes cuenta?',
      hasAccount:   '¿Ya tienes cuenta?',
      forgotPass:   '¿Olvidaste tu contraseña?',
      backToLogin:  'Volver al inicio de sesión',
      sendReset:    'Enviar enlace de recuperación',
      resetSent:    'Revisa tu correo para el enlace de recuperación.',
      signupOk:     'Cuenta creada. Revisa tu correo para confirmar.',
      errRequired:  'Correo y contraseña son requeridos.',
      errEmail:     'Ingresa un correo válido.',
      errShortPass: 'La contraseña debe tener al menos 6 caracteres.',
    },
    en: {
      title:        'LifeDesk',
      sub:          'CRM for life insurance agents',
      email:        'Email address',
      password:     'Password',
      login:        'Sign in',
      signup:       'Create account',
      reset:        'Reset password',
      noAccount:    "Don't have an account?",
      hasAccount:   'Already have an account?',
      forgotPass:   'Forgot your password?',
      backToLogin:  'Back to sign in',
      sendReset:    'Send reset link',
      resetSent:    'Check your email for the reset link.',
      signupOk:     'Account created. Check your email to confirm.',
      errRequired:  'Email and password are required.',
      errEmail:     'Enter a valid email address.',
      errShortPass: 'Password must be at least 6 characters.',
    }
  }
  const tx = t[lang]

  async function handleSubmit() {
    setMsg(null)

    if (mode === 'reset') {
      if (!email) return setMsg({ type: 'error', text: tx.errEmail })
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      setLoading(false)
      if (error) return setMsg({ type: 'error', text: error.message })
      return setMsg({ type: 'ok', text: tx.resetSent })
    }

    if (!email || !password) return setMsg({ type: 'error', text: tx.errRequired })
    if (!email.includes('@'))  return setMsg({ type: 'error', text: tx.errEmail })
    if (password.length < 6)   return setMsg({ type: 'error', text: tx.errShortPass })

    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) return setMsg({ type: 'error', text: error.message })
      return setMsg({ type: 'ok', text: tx.signupOk })
    }

    // login
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMsg({ type: 'error', text: error.message })
    onAuth()
  }

  // ─── Styles ───────────────────────────────────────────────
  const s = {
    wrap: {
      minHeight: '100vh',
      background: '#0d0d0d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Instrument Sans', system-ui, sans-serif",
      padding: '24px',
    },
    card: {
      background: '#161616',
      border: '1px solid #222',
      borderRadius: '12px',
      padding: '40px',
      width: '100%',
      maxWidth: '380px',
    },
    logo: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '4px',
      letterSpacing: '-0.5px',
    },
    sub: {
      fontSize: '13px',
      color: '#555',
      marginBottom: '32px',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      color: '#888',
      marginBottom: '6px',
      letterSpacing: '0.3px',
    },
    input: {
      width: '100%',
      background: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: '7px',
      padding: '10px 12px',
      color: '#e8e8e8',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '16px',
      transition: 'border-color 0.15s',
    },
    btn: {
      width: '100%',
      background: '#22c55e',
      color: '#000',
      border: 'none',
      borderRadius: '7px',
      padding: '11px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
      marginBottom: '20px',
      transition: 'opacity 0.15s',
    },
    link: {
      background: 'none',
      border: 'none',
      color: '#22c55e',
      cursor: 'pointer',
      fontSize: '13px',
      padding: '0',
      textDecoration: 'underline',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '13px',
      color: '#555',
    },
    alert: (type) => ({
      padding: '10px 12px',
      borderRadius: '7px',
      fontSize: '13px',
      marginBottom: '16px',
      background: type === 'error' ? '#2a1515' : '#152a1e',
      color: type === 'error' ? '#f87171' : '#4ade80',
      border: `1px solid ${type === 'error' ? '#3f1f1f' : '#1f3f2a'}`,
    }),
    langToggle: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'none',
      border: '1px solid #333',
      borderRadius: '6px',
      color: '#666',
      fontSize: '12px',
      padding: '4px 10px',
      cursor: 'pointer',
    },
  }

  return (
    <div style={s.wrap}>
      <button style={s.langToggle} onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}>
        {lang === 'es' ? '🇺🇸 EN' : '🇲🇽 ES'}
      </button>

      <div style={s.card}>
        <div style={s.logo}>{tx.title}</div>
        <div style={s.sub}>{tx.sub}</div>

        {msg && <div style={s.alert(msg.type)}>{msg.text}</div>}

        {/* Email */}
        <label style={s.label}>{tx.email}</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="agent@example.com"
          style={s.input}
          autoFocus
        />

        {/* Password (hidden in reset mode) */}
        {mode !== 'reset' && (
          <>
            <label style={s.label}>{tx.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={s.input}
            />
          </>
        )}

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? '...' : mode === 'login' ? tx.login : mode === 'signup' ? tx.signup : tx.sendReset}
        </button>

        <div style={s.row}>
          {mode === 'login' && (
            <>
              <span>{tx.noAccount} <button style={s.link} onClick={() => { setMode('signup'); setMsg(null) }}>{tx.signup}</button></span>
              <button style={s.link} onClick={() => { setMode('reset'); setMsg(null) }}>{tx.forgotPass}</button>
            </>
          )}
          {mode === 'signup' && (
            <span>{tx.hasAccount} <button style={s.link} onClick={() => { setMode('login'); setMsg(null) }}>{tx.login}</button></span>
          )}
          {mode === 'reset' && (
            <button style={s.link} onClick={() => { setMode('login'); setMsg(null) }}>{tx.backToLogin}</button>
          )}
        </div>
      </div>
    </div>
  )
}
