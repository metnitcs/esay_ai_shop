import { createClient } from '@supabase/supabase-js';

// Fallback values to prevent application crash if environment variables are missing.
// This allows the app to load, though authentication will fail until keys are set.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY) {
  console.warn("Supabase credentials missing. App running in offline/demo mode (Auth will fail).");
}

export const supabase = createClient(supabaseUrl, supabaseKey);