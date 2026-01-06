/**
 * Provider Service
 * Handles provider/profile data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Provider, ProviderBookingStats, SignupCode } from '@/types';
import { isValidUUID } from '@/utils/validation';
import { handleError, retryWithBackoff } from '@/utils/errorHandler';

/**
 * Fetch all providers (excluding admins)
 */
export async function fetchProviders(): Promise<Provider[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profile')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;

  // Get admin user IDs to filter them out
  const { data: adminRoles } = await supabase
    .from('user_role')
    .select('user_id')
    .eq('role', 'admin');

  const adminIds = new Set(adminRoles?.map((r) => r.user_id) || []);
  
  return (profiles || []).filter((p) => !adminIds.has(p.id));
}

/**
 * Fetch provider booking statistics
 */
export async function fetchProviderBookingStats(): Promise<Record<string, ProviderBookingStats>> {
  const { data } = await supabase
    .from('booking')
    .select('provider_id, status');

  const statsMap: Record<string, ProviderBookingStats> = {};

  if (data) {
    data.forEach((booking) => {
      if (!statsMap[booking.provider_id]) {
        statsMap[booking.provider_id] = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
      }
      
      const status = booking.status as keyof ProviderBookingStats;
      if (status in statsMap[booking.provider_id]) {
        statsMap[booking.provider_id][status]++;
      }
    });
  }

  return statsMap;
}

/**
 * Update provider active status
 */
export async function updateProviderStatus(providerId: string, active: boolean): Promise<void> {
  // Validate inputs
  if (!providerId || !isValidUUID(providerId)) {
    throw new Error('Provider ID non valido');
  }
  
  if (typeof active !== 'boolean') {
    throw new Error('Stato attivo deve essere un valore booleano');
  }

  return retryWithBackoff(async () => {
    // First check if provider exists
    const { data: existing, error: fetchError } = await supabase
      .from('profile')
      .select('id')
      .eq('id', providerId)
      .maybeSingle();

    if (fetchError) {
      const appError = handleError(fetchError, { operation: 'updateProviderStatus_check', providerId });
      throw new Error(appError.userMessage);
    }

    if (!existing) {
      throw new Error('Provider non trovato');
    }

    const { error } = await supabase
      .from('profile')
      .update({ active })
      .eq('id', providerId);

    if (error) {
      const appError = handleError(error, { operation: 'updateProviderStatus', providerId, active });
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Fetch signup codes
 */
export async function fetchSignupCodes(): Promise<SignupCode[]> {
  const { data, error } = await supabase
    .from('signup_code')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Generate new signup code
 */
export async function generateSignupCode(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_signup_code');

  if (error) throw error;
  return data;
}

/**
 * Subscribe to signup code changes
 */
export function subscribeToSignupCodeChanges(callback: () => void) {
  const channel = supabase
    .channel('signup-codes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'signup_code' }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to profile changes
 */
export function subscribeToProfileChanges(callback: () => void) {
  const channel = supabase
    .channel('profiles-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profile' }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}