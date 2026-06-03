import { createServerClient } from '@supabase/ssr'
import { getCanonicalDashboardPathname, isDashboardPathname } from '@/lib/dashboard-routes'
import { getSupabaseEnv } from './env'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const canonicalDashboardPathname = getCanonicalDashboardPathname(request.nextUrl.pathname)

  // Normalize common dashboard aliases before routing to avoid 404s.
  if (
    canonicalDashboardPathname &&
    request.nextUrl.pathname !== canonicalDashboardPathname
  ) {
    const normalizedUrl = request.nextUrl.clone()
    normalizedUrl.pathname = canonicalDashboardPathname
    return NextResponse.redirect(normalizedUrl)
  }

  const { isConfigured, supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

  if (!isConfigured) {
    if (
      isDashboardPathname(request.nextUrl.pathname) ||
      request.nextUrl.pathname === '/'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes - redirect to login if not authenticated
  if (
    isDashboardPathname(request.nextUrl.pathname) &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (
    (request.nextUrl.pathname.startsWith('/auth/login') ||
      request.nextUrl.pathname.startsWith('/auth/sign-up')) &&
    user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect root to dashboard if authenticated, otherwise to login
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
