// YouTube Data API and Analytics API Service
// Handles fetching channel info and analytics from YouTube

import { getUserSocialTokens, updateAccountLastSync, storeSocialAnalytics } from '@/lib/social-tokens';

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export class YouTubeAPI {
  private dataBaseUrl = 'https://www.googleapis.com/youtube/v3';
  private analyticsBaseUrl = 'https://youtubeanalytics.googleapis.com/v2';

  /**
   * Get authenticated user's channel information
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannel> {
    const response = await fetch(
      `${this.dataBaseUrl}/channels?part=snippet,statistics&mine=true`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    return data.items[0];
  }

  /**
   * Get channel analytics
   */
  async getChannelAnalytics(accessToken: string, channelId: string): Promise<any> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const metrics = 'views,comments,likes,dislikes,shares,estimatedMinutesWatched,averageViewDuration';
    const response = await fetch(
      `${this.analyticsBaseUrl}/reports?ids=channel==${channelId}&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // YouTube Analytics API can be picky about permissions
      console.warn(`YouTube Analytics API error: ${response.status}`);
      return null;
    }

    return response.json();
  }

  /**
   * Get analytics data for a specific user's connected YouTube account
   */
  async getAnalyticsForUser(userId: string): Promise<{
    followers: number;
    following: number;
    posts: number;
    engagement: number;
    reach: number;
    impressions: number;
  } | null> {
    try {
      const tokenData = await getUserSocialTokens(userId, 'YOUTUBE');
      if (!tokenData) return null;

      const analytics = await this.getAnalyticsData(tokenData.accessToken);
      
      await updateAccountLastSync(tokenData.id);
      await storeSocialAnalytics(tokenData.id, analytics);
      
      return analytics;
    } catch (error) {
      console.error(`Error fetching YouTube analytics for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get analytics data formatted for our database
   */
  async getAnalyticsData(accessToken: string): Promise<{
    followers: number;
    following: number;
    posts: number;
    engagement: number;
    reach: number;
    impressions: number;
  }> {
    try {
      const channel = await this.getChannelInfo(accessToken);
      const analytics = await this.getChannelAnalytics(accessToken, channel.id);

      // Process analytics report
      let totalViews = parseInt(channel.statistics.viewCount) || 0;
      let subscribers = parseInt(channel.statistics.subscriberCount) || 0;
      let videoCount = parseInt(channel.statistics.videoCount) || 0;
      
      let engagementRate = 0;
      if (analytics && analytics.rows && analytics.rows.length > 0) {
        // Find indexes for metrics
        const headers = analytics.columnHeaders.map((h: any) => h.name);
        const viewsIdx = headers.indexOf('views');
        const likesIdx = headers.indexOf('likes');
        const commentsIdx = headers.indexOf('comments');
        
        let totalPeriodViews = 0;
        let totalPeriodEngagement = 0;
        
        analytics.rows.forEach((row: any) => {
          const views = row[viewsIdx] || 0;
          const likes = row[likesIdx] || 0;
          const comments = row[commentsIdx] || 0;
          
          totalPeriodViews += views;
          totalPeriodEngagement += (likes + comments);
        });
        
        engagementRate = totalPeriodViews > 0 ? (totalPeriodEngagement / totalPeriodViews) * 100 : 0;
      }

      return {
        followers: subscribers,
        following: 0,
        posts: videoCount,
        engagement: Math.round(engagementRate * 100) / 100,
        reach: totalViews,
        impressions: totalViews * 2, // Estimated impressions
      };
    } catch (error) {
      console.error('Error fetching YouTube analytics data:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube token refresh error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
