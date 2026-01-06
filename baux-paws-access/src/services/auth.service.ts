/**
 * Auth Service
 * Handles authentication-related operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types';

/**
 * Check if current user has admin role
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  return !!data;
}

/**
 * Check if user has specific role
 */
export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  const { data } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();

  return !!data;
}

/**
 * Get user role redirect path based on role
 */
export async function getUserRedirectPath(userId: string): Promise<string> {
  const isAdmin = await checkIsAdmin(userId);
  return isAdmin ? '/admin' : '/dashboard';
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Validate signup code
 */
export async function validateSignupCode(code: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_signup_code', {
    _code: code,
    _user_id: userId,
  });

  if (error) return false;
  return data === true;
}