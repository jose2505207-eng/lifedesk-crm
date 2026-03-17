import { useState } from 'react'
import { supabase } from './lib/supabase.js'

const T = {
  en: {
    login: 'Sign In', signup: 'Create Account', reset: 'Reset Password',
    email: 'Email', password: 'Password', confirmPassword: 'Confirm Password',
    loginBtn: 'Sign In', signupBtn: 'Create Account', resetBtn: 'Send Reset Email',
    noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
    forgotPassword: 'Forgot password?', backToLogin: 'Back to sign in',
    resetSent: 'Check your email for the reset link.',
    passwordMismatch: 'Passwords do not match.',
    tagline: 'CRM for life insurance agents',
  },
  es: {
    login: 'Iniciar Sesión', signup: 'Crear Cuenta', reset: 'Restablecer Contraseña',
    email: 'Correo electrónico', password: 'Contraseña', confirmPassword: 'Confirmar Contraseña',
    loginBtn: 'Iniciar Sesión', signupBtn: 'Crear Cuenta', resetBtn: 'Enviar Correo',
    noAccount: '¿No tienes cuenta?', hasAccount: '¿Ya tienes cuenta?',
    forgotPassword: '¿Olvidaste tu contraseña?', backToLogin: 'Volver al inicio',
    resetSent: 'Revisa tu correo para el enlace de restablecimiento.',
    passwordMismatch: 'Las contraseñas no coinciden.',
    tagline: 'CRM para agentes de seguros de vida',
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [lang, setLang] = useState('es')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const t = T[lang]

  const handleSubmit = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t.passwordMismatch)
      setLoading(false)
      return
    }

    let result
    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else if (mode === 'signup') {
      result = await supabase.auth.signUp({ email, password })
    } else {
      result = await supabase.auth.resetPasswordForEmail(email)
      if (!result.error) setMessage(t.resetSent)
    }

    if (result.error) setError(result.error.message)
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        {/* Lang toggle */}
        <div style={s.langRow}>
          <button style={{ ...s.langBtn, ...(lang === 'es' ? s.langActive : {}) }} onClick={() => setLang('es')}>ES</button>
          <button style={{ ...s.langBtn, ...(lang === 'en' ? s.langActive : {}) }} onClick={() => setLang('en')}>EN</button>
        </div>

        {/* Logo */}
        <div style={s.logo}>LD</div>
        <h1 style={s.title}>LifeDesk</h1>
        <p style={s.subtitle}>{t.tagline}</p>

        {/* Form */}
        <div style={s.form}>
          <div style={s.formGroup}>
            <label style={s.label}>{t.email}</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="nombre@correo.com"
            />
          </div>

          {mode !== 'reset' && (
            <div style={s.formGroup}>
              <label style={s.label}>{t.password}</label>
              <input
                style={s.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {mode === 'signup' && (
            <div style={s.formGroup}>
              <label style={s.label}>{t.confirmPassword}</label>
              <input
                style={s.input}
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {error && <div style={s.error}>{error}</div>}
          {message && <div style={s.success}>{message}</div>}

          <button style={s.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? '...' : mode === 'login' ? t.loginBtn : mode === 'signup' ? t.signupBtn : t.resetBtn}
          </button>
        </div>

        {/* Links */}
        <div style={s.links}>
          {mode === 'login' && (
            <>
              <button style={s.link} onClick={() => { setMode('signup'); setError('') }}>{t.noAccount}</button>
              <button style={s.link} onClick={() => { setMode('reset'); setError('') }}>{t.forgotPassword}</button>
            </>
          )}
          {mode === 'signup' && (
            <button style={s.link} onClick={() => { setMode('login'); setError('') }}>{t.hasAccount}</button>
          )}
          {mode === 'reset' && (
            <button style={s.link} onClick={() => { setMode('login'); setError(''); setMessage('') }}>{t.backToLogin}</button>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    position: 'relative',
  },
  langRow: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    gap: 4,
  },
  langBtn: {
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 500,
  },
  langActive: {
    backgroundColor: '#111827',
    color: '#fff',
    borderColor: '#111827',
  },
  logo: {
    width: 48,
    height: 48,
    backgroundColor: '#111827',
    color: '#fff',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    margin: '0 auto 14px',
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 4px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    margin: '0 0 28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    padding: '9px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#f9fafb',
  },
  submitBtn: {
    padding: '11px 0',
    backgroundColor: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 4,
  },
  error: {
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 13,
  },
  success: {
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    color: '#16a34a',
    fontSize: 13,
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
