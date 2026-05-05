import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { encryptToken } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    if (error) {
      console.error('YouTube OAuth error:', error);
      return redirect(`${baseUrl}/settings?error=youtube_auth_failed`);
    }

    if (!code) {
      return redirect(`${baseUrl}/settings?error=youtube_auth_failed&message=No code received`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange YouTube code for token:', errorData);
      return redirect(`${baseUrl}/settings?error=youtube_token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get channel information
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    if (!channelResponse.ok) {
      console.error('Failed to fetch YouTube channel info');
      return redirect(`${baseUrl}/settings?error=youtube_channel_failed`);
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      return redirect(`${baseUrl}/settings?error=youtube_no_channel`);
    }

    // Save the connection to database
    const user = await getCurrentUser();
    if (!user) {
      return redirect(`${baseUrl}/settings?error=not_authenticated`);
    }

    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;

    await prisma.socialMediaAccount.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: 'YOUTUBE'
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        username: channel.snippet.title,
        displayName: channel.snippet.title,
        profileImage: channel.snippet.thumbnails?.default?.url,
        platformUserId: channel.id,
        isActive: true,
        lastSync: new Date(),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
      },
      create: {
        userId: user.id,
        platform: 'YOUTUBE',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        username: channel.snippet.title,
        displayName: channel.snippet.title,
        profileImage: channel.snippet.thumbnails?.default?.url,
        platformUserId: channel.id,
        isActive: true,
        lastSync: new Date(),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
      }
    });

    return redirect(`${baseUrl}/settings?success=youtube_connected&channel=` + encodeURIComponent(channel.snippet.title));
  } catch (error) {
    console.error('Error processing YouTube OAuth callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return redirect(`${baseUrl}/settings?error=youtube_callback_error`);
  }
}
