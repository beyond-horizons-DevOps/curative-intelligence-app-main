'use client'

import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/Toast'
import { Loader2, ChevronRight } from 'lucide-react'
import React from 'react'

type Props = {
  label?: string
  redirectTo?: string
  withAnalytics?: boolean
}

export default function GoogleButton({ 
  label = 'Continue with Google', 
  redirectTo,
  withAnalytics = true 
}: Props) {
  const [loading, setLoading] = React.useState(false)
  const supabase = getSupabaseBrowser()
  const { toast } = useToast()

  const onClick = async () => {
    try {
      if (loading) return
      setLoading(true)
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || ''
      
      const callbackUrl = `${origin}/api/auth/callback`
      const finalDestination = redirectTo || '/dashboard'
      
      const scopes = withAnalytics 
        ? 'openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'
        : 'openid email profile'
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${callbackUrl}?next=${encodeURIComponent(finalDestination)}`,
          scopes: scopes,
          queryParams: { 
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      })
      if (error) {
        const normalizedMessage =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: string }).message)
            : 'Google sign-in is currently unavailable.'

        const userMessage = /unsupported provider/i.test(normalizedMessage)
          ? 'Google sign-in is not enabled for this workspace yet. Please contact an administrator to configure Google OAuth in Supabase.'
          : normalizedMessage

        throw new Error(userMessage)
      }
    } catch (error) {
      console.error('Google OAuth failed', error)
      const description =
        error instanceof Error && error.message
          ? error.message
          : 'We could not reach Google right now. Please try again in a moment.'

      toast({
        title: 'Google sign-in unavailable',
        description,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#3A2F2F] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2B193] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      aria-disabled={loading}
      aria-busy={loading}
      aria-label={label}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <img alt="Google" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-4 w-4" />
      )}
      <span>{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 opacity-60" />
    </button>
  )
}

