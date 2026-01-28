'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user ?? null, loading: false });
    });

    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({
      user: session?.user ?? null,
      loading: false,
      initialized: true
    });
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, displayName?: string) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });
    set({ loading: false });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`
      }
    });
    if (error) {
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
