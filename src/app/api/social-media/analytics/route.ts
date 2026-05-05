import { NextRequest, NextResponse } from 'next/server';
import { socialMediaService } from '@/services/social-media-service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const analytics = await socialMediaService.getUserAnalytics(user.id);

    return NextResponse.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error in social media analytics API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
