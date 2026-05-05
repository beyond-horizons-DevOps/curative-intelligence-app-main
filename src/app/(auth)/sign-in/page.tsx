"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import GoogleButton from '@/components/auth/GoogleButton'
import FacebookButton from '@/components/auth/FacebookButton'

export default function SignInPage() {
  const supabase = getSupabaseBrowser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'otp'>('password')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'otp') {
        const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' })
        if (error) throw error
        window.location.href = '/dashboard'
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Check if user exists in public database
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try {
          const res = await fetch('/api/user/status')
          if (!res.ok) throw new Error('Service unavailable')
          // If status returns default (onboardingComplete: false) but user exists in Auth,
          // it means they are being created or already exist.
          // If the API failed to connect to DB, it would have thrown 500, caught below.
        } catch (e) {
          // If we can't verify user status (e.g. DB down), sign them out
          await supabase.auth.signOut()
          throw new Error('Unable to verify account status. Please try again later.')
        }
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      const message =
        err?.message || 'Unable to reach the authentication service. Please try again in a moment.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-brand-alabaster relative px-4">
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(58,47,47,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(58,47,47,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative glass rounded-2xl p-8 border-white/20 w-full max-w-md">
        <h1 className="text-2xl font-display text-center text-brand-dark-umber">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-[#7A6F6F]">Sign in to continue</p>

        <div className="mt-6 space-y-3">
          <GoogleButton />
          <FacebookButton />
        </div>
        <div className="my-4 flex items-center gap-3 text-xs text-[#7A6F6F]">
          <div className="h-px flex-1 bg-black/10" />
          <span>or</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#3A2F2F]">Email address</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          {mode === 'password' ? (
            <div>
              <label className="text-sm font-medium text-[#3A2F2F]">Password</label>
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div className="mt-2 text-xs text-right">
                <a href="/reset-password" className="underline text-[#7A6F6F]">Forgot password?</a>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-[#3A2F2F]">Enter the 6-digit code</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                required
              />
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (mode === 'otp' ? 'Verifying...' : 'Signing in...') : 'Continue'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-[#7A6F6F]">
          {mode === 'password' ? (
            <button
              className="underline"
              type="button"
              onClick={async () => {
                if (!email) { setError('Enter your email first'); return }
                setLoading(true)
                setError(null)
                setOtpCode('')
                try {
                  const { error } = await supabase.auth.signInWithOtp({ email })
                  if (error) throw error
                  setMode('otp')
                } catch (err: any) {
                  const message =
                    err?.message || 'Unable to send the code right now. Please try again shortly.'
                  setError(message)
                } finally {
                  setLoading(false)
                }
              }}
            >
              Continue with email code
            </button>
          ) : (
            <button className="underline" type="button" onClick={() => setMode('password')}>
              Use password instead
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[#7A6F6F]">
          Don't have an account? <a href="/sign-up" className="underline">Sign up</a>
        </p>
      </div>
    </div>
  )
}
