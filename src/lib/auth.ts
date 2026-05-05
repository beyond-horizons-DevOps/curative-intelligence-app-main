import { prisma } from './prisma';
import { getSupabaseUserFromCookies } from './supabase';
import { ensureUserBySupabase, extractProfileFromSupabaseUser } from './user-supabase';

/**
 * Get the current authenticated user from session
 * Returns null if user is not authenticated
 */
export async function getCurrentUser(): Promise<{ id: string; email?: string | null } | null> {
  try {
    const su = await getSupabaseUserFromCookies();
    
    if (!su) {
      return null;
    }

    // Ensure user exists in our database and get their internal ID
    const user = await ensureUserBySupabase(
      su.id,
      su.email ?? null,
      extractProfileFromSupabaseUser(su)
    );
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current authenticated user ID
 * Throws an error if user is not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  
  if (!user || !user.id) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
}

/**
 * Get user by ID from database
 */
export async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        firstName: true,
        lastName: true,
        onboardingComplete: true 
      },
    });
    return user;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}