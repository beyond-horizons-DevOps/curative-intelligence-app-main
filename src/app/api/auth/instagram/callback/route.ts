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
    const errorDescription = searchParams.get('error_description');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    if (error) {
      console.error('Instagram OAuth error:', error, errorDescription);
      return redirect(`${baseUrl}/settings?error=instagram_auth_failed&message=` + encodeURIComponent(errorDescription || 'Authentication failed'));
    }

    if (!code) {
      return redirect(`${baseUrl}/settings?error=instagram_auth_failed&message=` + encodeURIComponent('No authorization code received'));
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID || '',
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange Instagram code for token:', errorData);
      return redirect(`${baseUrl}/settings?error=instagram_token_exchange_failed&message=` + encodeURIComponent('Failed to exchange authorization code'));
    }

    const tokenData = await tokenResponse.json();

    // Get user profile information
    const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`);
    
    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error('Failed to fetch Instagram user profile:', errorData);
      return redirect(`${baseUrl}/settings?error=instagram_profile_failed&message=` + encodeURIComponent('Failed to fetch user profile'));
    }

    const profileData = await profileResponse.json();

    // Save the connection to database
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('No authenticated user found during Instagram callback');
      return redirect(`${baseUrl}/settings?error=not_authenticated`);
    }

    // Encrypt the access token
    const encryptedAccessToken = encryptToken(tokenData.access_token);

    await prisma.socialMediaAccount.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: 'INSTAGRAM'
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        username: profileData.username,
        platformUserId: profileData.id,
        isActive: true,
        lastSync: new Date()
      },
      create: {
        userId: user.id,
        platform: 'INSTAGRAM',
        accessToken: encryptedAccessToken,
        username: profileData.username,
        platformUserId: profileData.id,
        isActive: true,
        lastSync: new Date()
      }
    });

    console.log('Instagram connection successful for user:', user.id);

    return redirect(`${baseUrl}/settings?success=instagram_connected&username=` + encodeURIComponent(profileData.username));
  } catch (error) {
    console.error('Error processing Instagram OAuth callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return redirect(`${baseUrl}/settings?error=instagram_callback_error&message=` + encodeURIComponent('Internal server error'));
  }
}