export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return {
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
  }
}

export function getRequiredSupabaseEnv() {
  const env = getSupabaseEnv()

  if (!env.isConfigured) {
    throw new Error(
      'Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.',
    )
  }

  return {
    supabaseUrl: env.supabaseUrl!,
    supabaseAnonKey: env.supabaseAnonKey!,
  }
}
