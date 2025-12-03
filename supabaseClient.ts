import { createClient } from '@supabase/supabase-js';

// Fallback values to prevent application crash if environment variables are missing.
// This allows the app to load, though authentication will fail until keys are set.
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn("Supabase credentials missing. App running in offline/demo mode (Auth will fail).");
}

export const supabase = createClient(supabaseUrl, supabaseKey);