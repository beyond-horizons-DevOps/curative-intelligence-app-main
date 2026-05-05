// Unified Social Media Analytics Service
// Orchestrates all social media APIs and provides unified data access

import { InstagramAPI } from './instagram-api';
import { FacebookAPI } from './facebook-api';
import { TwitterAPI } from './twitter-api';
import { LinkedInAPI } from './linkedin-api';
import { YouTubeAPI } from './youtube-api';
import { getUserSocialAccounts } from '@/lib/social-tokens';

export type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE';

export interface SocialMediaAccount {
  id: string;
  platform: Platform;
  platformUserId: string;
  displayName: string;
  username?: string;
  profileImage?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  lastSync?: Date;
}

export interface SocialMediaAnalytics {
  accountId: string;
  platform: Platform;
  date: Date;
  followers: number;
  following: number;
  posts: number;
  engagement: number;
  reach?: number;
  impressions?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsResponse {
  success: boolean;
  data?: SocialMediaAnalytics;
  error?: string;
}

export class SocialMediaService {
  private instagramAPI = new InstagramAPI();
  private facebookAPI = new FacebookAPI();
  private twitterAPI = new TwitterAPI();
  private linkedInAPI = new LinkedInAPI();
  private youtubeAPI = new YouTubeAPI();

  /**
   * Get analytics for all connected social media accounts for a user
   */
  async getUserAnalytics(userId: string): Promise<{
    instagram: any;
    facebook: any;
    twitter: any;
    linkedin: any;
    youtube: any;
    connectedAccounts: any[];
  }> {
    try {
      // Get user's connected accounts
      const connectedAccounts = await getUserSocialAccounts(userId);
      
      // Fetch analytics from each connected platform
      const [instagramData, facebookData, twitterData, linkedinData, youtubeData] = await Promise.all([
        this.instagramAPI.getAnalyticsForUser(userId),
        this.facebookAPI.getAnalyticsForUser(userId),
        this.twitterAPI.getAnalyticsForUser(userId),
        this.linkedInAPI.getAnalyticsForUser(userId),
        this.youtubeAPI.getAnalyticsForUser(userId)
      ]);

      return {
        instagram: instagramData,
        facebook: facebookData,
        twitter: twitterData,
        linkedin: linkedinData,
        youtube: youtubeData,
        connectedAccounts: connectedAccounts
      };
    } catch (error) {
      console.error(`Error fetching user analytics for user ${userId}:`, error);
      return {
        instagram: null,
        facebook: null,
        twitter: null,
        linkedin: null,
        youtube: null,
        connectedAccounts: []
      };
    }
  }

  /**
   * Fetch analytics data for a specific account (legacy method using access tokens)
   */
  async getAccountAnalytics(account: SocialMediaAccount): Promise<AnalyticsResponse> {
    try {
      let analyticsData;

      switch (account.platform) {
        case 'INSTAGRAM':
          analyticsData = await this.instagramAPI.getAnalyticsData(account.accessToken);
          break;

        case 'FACEBOOK':
          // For Facebook, we need the page ID which should be stored in platformUserId
          analyticsData = await this.facebookAPI.getAnalyticsData(
            account.platformUserId,
            account.accessToken
          );
          break;

        case 'TWITTER':
          analyticsData = await this.twitterAPI.getAnalyticsData(
            account.platformUserId,
            account.accessToken
          );
          break;

        case 'LINKEDIN':
          analyticsData = await this.linkedInAPI.getAnalyticsData(account.accessToken);
          break;

        case 'YOUTUBE':
          analyticsData = await this.youtubeAPI.getAnalyticsData(account.accessToken);
          break;

        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }

      const result: SocialMediaAnalytics = {
        accountId: account.id,
        platform: account.platform,
        date: new Date(),
        ...analyticsData,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`Error fetching analytics for ${account.platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Fetch analytics for multiple accounts
   */
  async getMultipleAccountAnalytics(accounts: SocialMediaAccount[]): Promise<{
    successful: SocialMediaAnalytics[];
    failed: Array<{ accountId: string; platform: Platform; error: string }>;
  }> {
    const results = await Promise.allSettled(
      accounts.map(account => this.getAccountAnalytics(account))
    );

    const successful: SocialMediaAnalytics[] = [];
    const failed: Array<{ accountId: string; platform: Platform; error: string }> = [];

    results.forEach((result, index) => {
      const account = accounts[index];
      
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        successful.push(result.value.data);
      } else {
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error || 'Unknown error';
        
        failed.push({
          accountId: account.id,
          platform: account.platform,
          error: error.toString(),
        });
      }
    });

    return { successful, failed };
  }

  /**
   * Test connection for an account
   */
  async testConnection(account: SocialMediaAccount): Promise<{
    success: boolean;
    userInfo?: any;
    error?: string;
  }> {
    try {
      let userInfo;

      switch (account.platform) {
        case 'INSTAGRAM':
          userInfo = await this.instagramAPI.getUserProfile(account.accessToken);
          break;

        case 'FACEBOOK':
          userInfo = await this.facebookAPI.getPageDetails(
            account.platformUserId,
            account.accessToken
          );
          break;

        case 'TWITTER':
          userInfo = await this.twitterAPI.getUserById(
            account.platformUserId,
            account.accessToken
          );
          break;

        case 'LINKEDIN':
          userInfo = await this.linkedInAPI.getProfile(account.accessToken);
          break;

        case 'YOUTUBE':
          userInfo = await this.youtubeAPI.getChannelInfo(account.accessToken);
          break;

        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }

      return {
        success: true,
        userInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Refresh access token for an account
   */
  async refreshAccessToken(account: SocialMediaAccount): Promise<{
    success: boolean;
    newToken?: string;
    newRefreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      if (!account.refreshToken) {
        throw new Error('No refresh token available');
      }

      let tokenData;

      switch (account.platform) {
        case 'INSTAGRAM':
          tokenData = await this.instagramAPI.refreshAccessToken(account.accessToken);
          return {
            success: true,
            newToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
          };

        case 'FACEBOOK':
          // Facebook tokens can be extended
          const clientId = process.env.FACEBOOK_APP_ID;
          const clientSecret = process.env.FACEBOOK_APP_SECRET;
          
          if (!clientId || !clientSecret) {
            throw new Error('Facebook credentials not configured');
          }

          tokenData = await this.facebookAPI.extendAccessToken(
            account.accessToken,
            clientId,
            clientSecret
          );
          return {
            success: true,
            newToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
          };

        case 'TWITTER':
          const twitterClientId = process.env.TWITTER_CLIENT_ID;
          const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET;
          
          if (!twitterClientId || !twitterClientSecret) {
            throw new Error('Twitter credentials not configured');
          }

          tokenData = await this.twitterAPI.refreshAccessToken(
            account.refreshToken,
            twitterClientId,
            twitterClientSecret
          );
          return {
            success: true,
            newToken: tokenData.access_token,
            newRefreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
          };

        case 'LINKEDIN':
          const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
          const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
          
          if (!linkedInClientId || !linkedInClientSecret) {
            throw new Error('LinkedIn credentials not configured');
          }

          tokenData = await this.linkedInAPI.refreshAccessToken(
            account.refreshToken,
            linkedInClientId,
            linkedInClientSecret
          );
          return {
            success: true,
            newToken: tokenData.access_token,
            newRefreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
          };

        case 'YOUTUBE':
          const youtubeClientId = process.env.YOUTUBE_CLIENT_ID;
          const youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET;
          
          if (!youtubeClientId || !youtubeClientSecret) {
            throw new Error('YouTube credentials not configured');
          }

          tokenData = await this.youtubeAPI.refreshAccessToken(
            account.refreshToken,
            youtubeClientId,
            youtubeClientSecret
          );
          return {
            success: true,
            newToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
          };

        default:
          throw new Error(`Token refresh not supported for platform: ${account.platform}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Get platform-specific API instance
   */
  getAPI(platform: Platform) {
    switch (platform) {
      case 'INSTAGRAM':
        return this.instagramAPI;
      case 'FACEBOOK':
        return this.facebookAPI;
      case 'TWITTER':
        return this.twitterAPI;
      case 'LINKEDIN':
        return this.linkedInAPI;
      case 'YOUTUBE':
        return this.youtubeAPI;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get aggregated analytics across all platforms
   */
  async getAggregatedAnalytics(accounts: SocialMediaAccount[]): Promise<{
    totalFollowers: number;
    totalFollowing: number;
    totalPosts: number;
    avgEngagement: number;
    totalReach: number;
    totalImpressions: number;
    platformBreakdown: Record<Platform, SocialMediaAnalytics | null>;
  }> {
    const { successful } = await this.getMultipleAccountAnalytics(accounts);

    let totalFollowers = 0;
    let totalFollowing = 0;
    let totalPosts = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    let validAccounts = 0;

    const platformBreakdown: Record<Platform, SocialMediaAnalytics | null> = {
      INSTAGRAM: null,
      FACEBOOK: null,
      TWITTER: null,
      LINKEDIN: null,
      YOUTUBE: null,
    };

    successful.forEach(analytics => {
      totalFollowers += analytics.followers;
      totalFollowing += analytics.following;
      totalPosts += analytics.posts;
      totalEngagement += analytics.engagement;
      totalReach += analytics.reach || 0;
      totalImpressions += analytics.impressions || 0;
      validAccounts++;

      platformBreakdown[analytics.platform] = analytics;
    });

    return {
      totalFollowers,
      totalFollowing,
      totalPosts,
      avgEngagement: validAccounts > 0 ? totalEngagement / validAccounts : 0,
      totalReach,
      totalImpressions,
      platformBreakdown,
    };
  }

  /**
   * Validate API credentials for a platform
   */
  async validateCredentials(platform: Platform): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const envVars = {
        INSTAGRAM: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'],
        FACEBOOK: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
        TWITTER: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET', 'TWITTER_BEARER_TOKEN'],
        LINKEDIN: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
        YOUTUBE: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
      };

      const requiredVars = envVars[platform];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);

      if (missingVars.length > 0) {
        return {
          valid: false,
          error: `Missing environment variables: ${missingVars.join(', ')}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
}

// Export a singleton instance
export const socialMediaService = new SocialMediaService();