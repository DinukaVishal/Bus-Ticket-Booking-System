import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isLoading: true,
  });

  const fetchUserData = useCallback(async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if user is admin using the has_role function
    const { data: isAdminData } = await supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' });

    return {
      profile: profileData ? {
        id: profileData.id,
        userId: profileData.user_id,
        displayName: profileData.display_name,
        avatarUrl: profileData.avatar_url,
      } : null,
      isAdmin: isAdminData || false,
    };
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions with the trigger
          setTimeout(async () => {
            const userData = await fetchUserData(session.user.id);
            setAuthState({
              user: session.user,
              session,
              profile: userData.profile,
              isAdmin: userData.isAdmin,
              isLoading: false,
            });
          }, 0);
        } else {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            isAdmin: false,
            isLoading: false,
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        setAuthState({
          user: session.user,
          session,
          profile: userData.profile,
          isAdmin: userData.isAdmin,
          isLoading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  };
}
