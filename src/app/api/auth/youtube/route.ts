import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    if (!clientId) {
      return NextResponse.redirect(`${baseUrl}/settings?error=youtube_not_configured`);
    }

    // Google OAuth 2.0 scopes for YouTube
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly'
    ];

    const youtubeAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=code&access_type=offline&prompt=consent`;

    return NextResponse.redirect(youtubeAuthUrl);
  } catch (error) {
    console.error('Error initiating YouTube OAuth:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings?error=youtube_oauth_failed`);
  }
}
