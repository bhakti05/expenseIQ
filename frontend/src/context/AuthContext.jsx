/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase, { isSupabaseConfigured, supabaseConfigError } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: supabaseConfigError } };
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const register = async (email, password) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: supabaseConfigError } };
    }

    return supabase.auth.signUp({
      email,
      password,
    });
  };

  const logout = async () => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
