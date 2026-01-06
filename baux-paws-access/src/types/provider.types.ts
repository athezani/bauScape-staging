/**
 * Provider/Profile-related type definitions
 */

export type AppRole = 'admin' | 'provider';

export interface Provider {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProviderBookingStats {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface SignupCode {
  id: string;
  code: string;
  used: boolean;
  used_at: string | null;
  used_by?: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}