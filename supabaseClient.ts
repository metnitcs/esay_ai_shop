import { createClient } from '@supabase/supabase-js';

// These should be set in your environment variables
// For this demo, we assume they are available via process.env
// If running locally, you might need to create a .env file or hardcode them temporarily (not recommended for production)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL or Key is missing. Database features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);