import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { ensureUserBySupabase } from '@/lib/user-supabase'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/encryption'
import { InstagramAPI } from '@/services/instagram-api'

const instagramAPI = new InstagramAPI();

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      const { user, session } = data
      
      if (user) {
        try {
          const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
          const nameParts = fullName ? fullName.split(' ') : []
          
          const profile = {
            firstName: nameParts[0] ?? null,
            lastName: nameParts.slice(1).join(' ') || null,
            imageUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
            phone: user.user_metadata?.phone ?? user.phone ?? null,
          }
          
          const dbUser = await ensureUserBySupabase(user.id, user.email ?? null, profile)

          if (dbUser && session.provider_token) {
            const provider = user.app_metadata?.provider || session.user?.app_metadata?.provider;
            const encryptedAccessToken = encryptToken(session.provider_token);
            const encryptedRefreshToken = session.provider_refresh_token 
              ? encryptToken(session.provider_refresh_token) 
              : null;
            
            if (provider === 'google') {
              await prisma.socialMediaAccount.upsert({
                where: {
                  userId_platform: {
                    userId: dbUser.id,
                    platform: 'YOUTUBE'
                  }
                },
                update: {
                  accessToken: encryptedAccessToken,
                  refreshToken: encryptedRefreshToken,
                  isActive: true,
                  lastSync: new Date(),
                  username: user.user_metadata?.name || user.email,
                  displayName: user.user_metadata?.full_name || user.user_metadata?.name,
                  profileImage: user.user_metadata?.avatar_url,
                  tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
                },
                create: {
                  userId: dbUser.id,
                  platform: 'YOUTUBE',
                  accessToken: encryptedAccessToken,
                  refreshToken: encryptedRefreshToken,
                  platformUserId: user.id,
                  username: user.user_metadata?.name || user.email,
                  displayName: user.user_metadata?.full_name || user.user_metadata?.name,
                  profileImage: user.user_metadata?.avatar_url,
                  isActive: true,
                  lastSync: new Date(),
                  tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
                }
              });
            } else if (provider === 'facebook') {
              // 1. Link Facebook Page
              const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${session.provider_token}`);
              const pagesData = await pagesResponse.json();
              const firstPage = pagesData.data?.[0];

              if (firstPage) {
                await prisma.socialMediaAccount.upsert({
                  where: {
                    userId_platform: {
                      userId: dbUser.id,
                      platform: 'FACEBOOK'
                    }
                  },
                  update: {
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    isActive: true,
                    lastSync: new Date(),
                    username: firstPage.name,
                    displayName: firstPage.name,
                    platformUserId: firstPage.id,
                    pageId: firstPage.id,
                    tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
                  },
                  create: {
                    userId: dbUser.id,
                    platform: 'FACEBOOK',
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    platformUserId: firstPage.id,
                    pageId: firstPage.id,
                    username: firstPage.name,
                    displayName: firstPage.name,
                    isActive: true,
                    lastSync: new Date(),
                    tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
                  }
                });

                // 2. Discover and Link Instagram Business Account from that Page
                const instagramId = await instagramAPI.getInstagramIdFromPage(firstPage.id, session.provider_token);
                if (instagramId) {
                  const igDetails = await instagramAPI.getBusinessAccountDetails(instagramId, session.provider_token);
                  
                  await prisma.socialMediaAccount.upsert({
                    where: {
                      userId_platform: {
                        userId: dbUser.id,
                        platform: 'INSTAGRAM'
                      }
                    },
                    update: {
                      accessToken: encryptedAccessToken,
                      refreshToken: encryptedRefreshToken,
                      isActive: true,
                      lastSync: new Date(),
                      username: igDetails.username,
                      displayName: igDetails.name,
                      profileImage: igDetails.profile_picture_url,
                      platformUserId: igDetails.id,
                      tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
                    },
                    create: {
                      userId: dbUser.id,
                      platform: 'INSTAGRAM',
                      accessToken: encryptedAccessToken,
                      refreshToken: encryptedRefreshToken,
                      platformUserId: igDetails.id,
                      username: igDetails.username,
                      displayName: igDetails.name,
                      profileImage: igDetails.profile_picture_url,
                      isActive: true,
                      lastSync: new Date(),
                      tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
                    }
                  });
                  console.log(`[auth/callback] Linked Instagram account: ${igDetails.username}`);
                }
              }
            }
            
            console.log(`[auth/callback] Linked ${provider} analytics for user:`, dbUser.email);
          }
        } catch (dbError) {
          console.error('[auth/callback] Failed to process database user or social linking:', dbError)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
