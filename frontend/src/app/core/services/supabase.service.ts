import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Signals for reactive state
  private _user = signal<User | null>(null);
  private _session = signal<Session | null>(null);
  private _loading = signal(true);

  // Public computed signals
  user = this._user.asReadonly();
  session = this._session.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => !!this._user());

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );

    this.initAuth();
  }

  private async initAuth() {
    // Listen for auth changes first (important for OAuth callback)
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase] Auth state changed:', event);
      this._session.set(session);
      this._user.set(session?.user ?? null);
      this._loading.set(false);
    });

    // Check if we're on a callback URL with hash fragment
    // Supabase OAuth returns tokens in URL hash: #access_token=...
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Let Supabase handle the hash - it will trigger onAuthStateChange
      // The hash is automatically processed by Supabase client
      return;
    }

    // Get initial session for non-callback pages
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('[Supabase] Error getting session:', error);
    }
    this._session.set(session);
    this._user.set(session?.user ?? null);
    this._loading.set(false);
  }

  // Auth methods
  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    if (error) throw error;
  }

  // Get access token for API calls
  async getAccessToken(): Promise<string | null> {
    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (error) {
      console.error('[Supabase] Error getting session:', error);
      return null;
    }

    if (!session) {
      console.warn('[Supabase] No session found');
      return null;
    }

    return session.access_token;
  }

  // Get Supabase client for direct access
  get client() {
    return this.supabase;
  }
}
