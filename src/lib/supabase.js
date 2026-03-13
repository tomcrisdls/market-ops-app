/**
 * Supabase client — ready to activate.
 *
 * Setup steps:
 * 1. Create a free project at supabase.com
 * 2. Copy your Project URL and anon key
 * 3. Rename .env.example to .env.local and fill in the values
 * 4. Run the SQL in supabase/schema.sql in the Supabase SQL editor
 * 5. Replace storage.js functions with Supabase queries
 */

import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create the client if credentials are configured
export const supabase = (url && key) ? createClient(url, key) : null

export function isSupabaseReady() {
  return supabase !== null
}
