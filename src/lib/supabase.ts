import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          email: string;
          tier: 'free' | 'premium' | 'family';
          scans_remaining: number | null;
          auto_scan_enabled: boolean;
          is_admin: boolean;
          created_at: string;
        };
      };
      scan_history: {
        Row: {
          id: string;
          user_id: string;
          scan_type: string;
          input: string;
          threat_level: string;
          score: number;
          details: any;
          created_at: string;
        };
      };
    };
  };
};
