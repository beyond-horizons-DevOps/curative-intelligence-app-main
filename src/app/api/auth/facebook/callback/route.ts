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

    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription);
      return redirect(`${baseUrl}/settings?error=facebook_auth_failed&message=` + encodeURIComponent(errorDescription || 'Authentication failed'));
    }

    if (!code) {
      return redirect(`${baseUrl}/settings?error=facebook_auth_failed&message=` + encodeURIComponent('No authorization code received'));
    }

    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange Facebook code for token:', errorData);
      return redirect(`${baseUrl}/settings?error=facebook_token_exchange_failed&message=` + encodeURIComponent('Failed to exchange authorization code'));
    }

    const tokenData = await tokenResponse.json();

    // Get user's pages
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
    
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.text();
      console.error('Failed to fetch Facebook pages:', errorData);
      return redirect(`${baseUrl}/settings?error=facebook_pages_failed&message=` + encodeURIComponent('Failed to fetch pages'));
    }

    const pagesData = await pagesResponse.json();

    // Save the connection to database
    // For Facebook, we take the first page for now as the schema has a unique constraint on [userId, platform]
    const user = await getCurrentUser();
    
    if (!user) {
      return redirect(`${baseUrl}/settings?error=not_authenticated`);
    }

    const page = pagesData.data?.[0];
    if (page) {
      const encryptedAccessToken = encryptToken(page.access_token);

      await prisma.socialMediaAccount.upsert({
        where: {
          userId_platform: {
            userId: user.id,
            platform: 'FACEBOOK'
          }
        },
        update: {
          accessToken: encryptedAccessToken,
          username: page.name,
          displayName: page.name,
          platformUserId: page.id,
          pageId: page.id,
          isActive: true,
          lastSync: new Date()
        },
        create: {
          userId: user.id,
          platform: 'FACEBOOK',
          accessToken: encryptedAccessToken,
          username: page.name,
          displayName: page.name,
          platformUserId: page.id,
          pageId: page.id,
          isActive: true,
          lastSync: new Date()
        }
      });
    }

    console.log('Facebook connection successful for user:', user.id);

    const pageName = page?.name || 'No page found';
    return redirect(`${baseUrl}/settings?success=facebook_connected&page=` + encodeURIComponent(pageName));
  } catch (error) {
    console.error('Error processing Facebook OAuth callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return redirect(`${baseUrl}/settings?error=facebook_callback_error&message=` + encodeURIComponent('Internal server error'));
  }
}