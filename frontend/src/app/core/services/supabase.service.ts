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
    // Get initial session
    const { data: { session } } = await this.supabase.auth.getSession();
    this._session.set(session);
    this._user.set(session?.user ?? null);
    this._loading.set(false);

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
    });
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
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  // Get Supabase client for direct access
  get client() {
    return this.supabase;
  }
}
