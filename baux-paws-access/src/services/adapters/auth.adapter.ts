/**
 * Authentication Adapter Interface
 * 
 * This module abstracts authentication logic to allow for future external auth service integration.
 * Currently uses Supabase Auth, but designed to be swappable with external providers.
 * 
 * EXTERNAL INTEGRATION NOTES:
 * - Replace implementation with external auth provider (Auth0, Firebase, custom, etc.)
 * - Maintain the same interface for seamless transition
 * - Update AuthProvider enum when adding new providers
 */

import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AuthProvider = 'supabase' | 'external';
export type UserRole = 'admin' | 'provider';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole | null;
  metadata?: Record<string, unknown>;
}

export interface AuthSession {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupData extends AuthCredentials {
  companyName: string;
  contactName: string;
  signupCode: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

export interface AuthStateChangeCallback {
  (event: string, session: AuthSession | null): void;
}

/**
 * Authentication Adapter Interface
 * Implement this interface for different auth providers
 */
export interface IAuthAdapter {
  getCurrentUser(): Promise<AuthUser | null>;
  getCurrentSession(): Promise<AuthSession | null>;
  signIn(credentials: AuthCredentials): Promise<AuthResult>;
  signUp(data: SignupData): Promise<AuthResult>;
  signOut(): Promise<void>;
  checkUserRole(userId: string, role: UserRole): Promise<boolean>;
  onAuthStateChange(callback: AuthStateChangeCallback): () => void;
}

/**
 * Supabase Auth Adapter Implementation
 * Current default implementation using Supabase Auth
 */
class SupabaseAuthAdapter implements IAuthAdapter {
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const role = await this.getUserRole(user.id);
    return {
      id: user.id,
      email: user.email || '',
      role,
      metadata: user.user_metadata,
    };
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const role = await this.getUserRole(session.user.id);
    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role,
        metadata: session.user.user_metadata,
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || null,
    };
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const role = await this.getUserRole(data.user.id);
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role,
      },
      session: {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          role,
        },
        accessToken: data.session?.access_token || null,
        refreshToken: data.session?.refresh_token || null,
        expiresAt: data.session?.expires_at || null,
      },
    };
  }

  async signUp(data: SignupData): Promise<AuthResult> {
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          company_name: data.companyName,
          contact_name: data.contactName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!signupData.user) {
      return { success: false, error: 'Signup failed' };
    }

    // Validate signup code
    const { data: isValid } = await supabase.rpc('validate_signup_code', {
      _code: data.signupCode,
      _user_id: signupData.user.id,
    });

    if (!isValid) {
      return { success: false, error: 'Invalid signup code' };
    }

    return {
      success: true,
      user: {
        id: signupData.user.id,
        email: signupData.user.email || '',
        role: 'provider',
      },
    };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async checkUserRole(userId: string, role: UserRole): Promise<boolean> {
    const { data } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();

    return !!data;
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        let authSession: AuthSession | null = null;
        
        if (session) {
          const role = await this.getUserRole(session.user.id);
          authSession = {
            user: {
              id: session.user.id,
              email: session.user.email || '',
              role,
            },
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at || null,
          };
        }

        callback(event, authSession);
      }
    );

    return () => subscription.unsubscribe();
  }

  private async getUserRole(userId: string): Promise<UserRole | null> {
    const { data } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    return data?.role as UserRole || null;
  }
}

/**
 * External Auth Adapter Placeholder
 * Implement this class when integrating with external auth service
 */
class ExternalAuthAdapter implements IAuthAdapter {
  async getCurrentUser(): Promise<AuthUser | null> {
    // TODO: Implement external auth user fetch
    throw new Error('External auth adapter not implemented');
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    // TODO: Implement external auth session fetch
    throw new Error('External auth adapter not implemented');
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    // TODO: Implement external auth sign in
    throw new Error('External auth adapter not implemented');
  }

  async signUp(data: SignupData): Promise<AuthResult> {
    // TODO: Implement external auth sign up
    throw new Error('External auth adapter not implemented');
  }

  async signOut(): Promise<void> {
    // TODO: Implement external auth sign out
    throw new Error('External auth adapter not implemented');
  }

  async checkUserRole(userId: string, role: UserRole): Promise<boolean> {
    // TODO: Implement external role check
    throw new Error('External auth adapter not implemented');
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    // TODO: Implement external auth state change listener
    throw new Error('External auth adapter not implemented');
  }
}

// Factory function to get the appropriate auth adapter
export function getAuthAdapter(provider: AuthProvider = 'supabase'): IAuthAdapter {
  switch (provider) {
    case 'external':
      return new ExternalAuthAdapter();
    case 'supabase':
    default:
      return new SupabaseAuthAdapter();
  }
}

// Default export - current implementation
export const authAdapter = getAuthAdapter('supabase');
