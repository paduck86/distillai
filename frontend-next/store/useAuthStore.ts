import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: { id: 'test-user', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } as unknown as User,
    session: { access_token: 'mock-token', token_type: 'bearer', user: { id: 'test-user' } } as unknown as Session,
    loading: false,
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setLoading: (loading) => set({ loading }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
    },
}));

// Initialize auth listener
if (typeof window !== 'undefined') {
    // supabase.auth.onAuthStateChange((_event, session) => {
    //     useAuthStore.getState().setSession(session);
    //     useAuthStore.getState().setUser(session?.user ?? null);
    //     useAuthStore.getState().setLoading(false);
    // });
}
