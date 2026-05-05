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

export default function FacebookButton({ 
  label = 'Continue with Facebook', 
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
      
      // Facebook scopes for analytics
      // Standard: email, public_profile
      // Analytics: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights
      const scopes = withAnalytics 
        ? 'email public_profile pages_show_list pages_read_engagement instagram_basic instagram_manage_insights'
        : 'email public_profile'
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${callbackUrl}?next=${encodeURIComponent(finalDestination)}`,
          scopes: scopes,
        },
      })
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Facebook OAuth failed', error)
      toast({
        title: 'Facebook sign-in unavailable',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#1877F2] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )}
      <span>{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 opacity-60" />
    </button>
  )
}
