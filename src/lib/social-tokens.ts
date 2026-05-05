import { prisma } from './prisma';
import { SocialMediaPlatform } from '@prisma/client';
import { decryptToken } from './encryption';

/**
 * Get stored social media account tokens for a user
 */
export async function getUserSocialTokens(userId: string, platform: SocialMediaPlatform) {
  try {
    const account = await prisma.socialMediaAccount.findUnique({
      where: {
        userId_platform: {
          userId: userId,
          platform: platform
        }
      },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        isActive: true,
        platformUserId: true,
        username: true,
        lastSync: true
      }
    });

    if (!account || !account.isActive) {
      return null;
    }

    // Check if token is expired
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      console.warn(`Token expired for ${platform} account ${account.username}`);
      // We don't return null here if there's a refresh token, 
      // but for now let's keep it simple and just decrypt if valid or if we want to attempt refresh later
    }

    // Decrypt tokens
    try {
      return {
        ...account,
        accessToken: decryptToken(account.accessToken),
        refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : null
      };
    } catch (decryptError) {
      console.error(`Error decrypting tokens for ${platform} account ${account.username}:`, decryptError);
      // If decryption fails, maybe the token wasn't encrypted yet or key changed
      return account; 
    }
  } catch (error) {
    console.error(`Error getting ${platform} tokens for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get all active social media accounts for a user
 */
export async function getUserSocialAccounts(userId: string) {
  try {
    const accounts = await prisma.socialMediaAccount.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        profileImage: true,
        followerCount: true,
        lastSync: true,
        tokenExpiresAt: true
      }
    });

    return accounts;
  } catch (error) {
    console.error(`Error getting social accounts for user ${userId}:`, error);
    return [];
  }
}

/**
 * Update the last sync time for a social media account
 */
export async function updateAccountLastSync(accountId: string) {
  try {
    await prisma.socialMediaAccount.update({
      where: { id: accountId },
      data: { lastSync: new Date() }
    });
  } catch (error) {
    console.error(`Error updating last sync for account ${accountId}:`, error);
  }
}

/**
 * Store social media analytics data
 */
export async function storeSocialAnalytics(
  accountId: string,
  metrics: {
    followers: number;
    following: number;
    posts: number;
    engagement: number;
    reach: number;
    impressions: number;
  },
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY'
) {
  try {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // Reset to start of day for consistent dating

    await prisma.socialMediaAnalytics.upsert({
      where: {
        accountId_period_date: {
          accountId: accountId,
          period: period,
          date: date
        }
      },
      update: metrics,
      create: {
        accountId: accountId,
        period: period,
        date: date,
        ...metrics
      }
    });
  } catch (error) {
    console.error(`Error storing analytics for account ${accountId}:`, error);
  }
}