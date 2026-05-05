import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserSocialAccounts } from '@/lib/social-tokens';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's connected social media accounts
    const connectedAccounts = await getUserSocialAccounts(user.id);
    
    // Create a comprehensive list including all platforms
    const allPlatforms = ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TWITTER', 'LINKEDIN'];
    
    const accounts = allPlatforms.map(platform => {
      const connected = connectedAccounts.find(acc => acc.platform === platform);
      
      return {
        id: connected?.id || platform.toLowerCase(),
        platform: platform.toLowerCase(),
        username: connected?.username || null,
        displayName: connected?.displayName || null,
        isConnected: !!connected,
        followerCount: connected?.followerCount || null,
        lastSync: connected?.lastSync || null,
        profileImage: connected?.profileImage || null,
        tokenExpired: connected?.tokenExpiresAt ? new Date(connected.tokenExpiresAt) < new Date() : false
      };
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { platform, action } = await request.json();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'connect') {
      return NextResponse.json({ 
        success: true, 
        message: `${platform} connection initiated`,
        authUrl: `/api/auth/${platform.toLowerCase()}`
      });
    } else if (action === 'disconnect') {
      await prisma.socialMediaAccount.updateMany({
        where: {
          userId: user.id,
          platform: platform.toUpperCase() as any
        },
        data: {
          isActive: false,
          lastSync: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `${platform} disconnected successfully`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing social media account:', error);
    return NextResponse.json(
      { error: 'Failed to manage social media account' },
      { status: 500 }
    );
  }
}