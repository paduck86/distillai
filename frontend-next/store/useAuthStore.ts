import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: true,
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setLoading: (loading) => set({ loading }),
    signOut: async () => {
        if (isSupabaseConfigured()) {
            await supabase.auth.signOut();
        }
        set({ user: null, session: null });
    },
    initialize: async () => {
        if (!isSupabaseConfigured()) {
            // Supabase not configured - skip auth
            set({ loading: false, user: null, session: null });
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({
                session,
                user: session?.user ?? null,
                loading: false
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ loading: false, user: null, session: null });
        }
    }
}));

// Initialize auth listener
if (typeof window !== 'undefined' && isSupabaseConfigured()) {
    // Get initial session
    useAuthStore.getState().initialize();

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        useAuthStore.getState().setSession(session);
        useAuthStore.getState().setUser(session?.user ?? null);
        useAuthStore.getState().setLoading(false);
    });
}
