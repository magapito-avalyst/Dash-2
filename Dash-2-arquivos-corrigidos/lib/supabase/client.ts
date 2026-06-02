import { createBrowserClient } from '@supabase/ssr'
import { getRequiredSupabaseEnv } from './env'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getRequiredSupabaseEnv()

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
  )
}
