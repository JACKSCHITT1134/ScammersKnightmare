import { supabase } from './supabase';
import { User } from '@/types';

export const auth = {
  signUp: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: email.split('@')[0],
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Signup failed');

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      id: data.user.id,
      email: data.user.email!,
      username: profile?.username || data.user.email!.split('@')[0],
      tier: profile?.tier || 'free',
      scansRemaining: profile?.scans_remaining ?? 1,
      autoScanEnabled: profile?.auto_scan_enabled || false,
      isAdmin: profile?.is_admin || false,
    };
  },

  signIn: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Login failed');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      id: data.user.id,
      email: data.user.email!,
      username: profile?.username || data.user.email!.split('@')[0],
      tier: profile?.tier || 'free',
      scansRemaining: profile?.scans_remaining ?? 1,
      autoScanEnabled: profile?.auto_scan_enabled || false,
      isAdmin: profile?.is_admin || false,
    };
  },

  signOut: async (): Promise<void> => {
    // Clear admin session (both storage types)
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_email');
    sessionStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_username');
    sessionStorage.removeItem('admin_email');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async (): Promise<User | null> => {
    // Check for admin session first (localStorage for persistence)
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        return {
          id: 'admin',
          email: session.email,
          username: session.username,
          tier: 'family',
          scansRemaining: null,
          autoScanEnabled: true,
          isAdmin: true,
        };
      } catch (err) {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('admin_email');
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      email: user.email!,
      username: profile?.username || user.email!.split('@')[0],
      tier: profile?.tier || 'free',
      scansRemaining: profile?.scans_remaining ?? 1,
      autoScanEnabled: profile?.auto_scan_enabled || false,
      isAdmin: profile?.is_admin || false,
    };
  },
};
