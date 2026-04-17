import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setIgnoreTracking } from '../lib/analytics';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkAdmin = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', userId)
                .single();
            if (data) setIsAdmin(data.is_admin);
        } catch (error) {
            console.error('Error fetching admin status:', error);
        }
    };

    useEffect(() => {
        // Handle initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkAdmin(session.user.id);
            }
            // We set loading false immediately after getting session
            // checkAdmin will update isAdmin in background
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkAdmin(session.user.id);
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        setIgnoreTracking(isAdmin);
    }, [isAdmin]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
    };

    const value = useMemo(() => ({
        user,
        session,
        isAdmin,
        loading,
        signOut
    }), [user, session, isAdmin, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
