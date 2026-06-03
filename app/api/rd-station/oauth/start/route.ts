import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RD_AUTH_DIALOG_URL = 'https://api.rd.services/auth/dialog'

function getCallbackUrl(request: NextRequest) {
  if (process.env.RD_STATION_REDIRECT_URI) {
    return process.env.RD_STATION_REDIRECT_URI
  }

  return new URL('/api/rd-station/oauth/callback', request.url).toString()
}

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request: NextRequest) {
  const clientId = process.env.RD_STATION_CLIENT_ID
  const setupSecret = process.env.RD_STATION_OAUTH_SETUP_SECRET
  const receivedSetupSecret = request.nextUrl.searchParams.get('setup_secret')

  if (!clientId) {
    return htmlResponse(
      '<h1>RD Station OAuth nao configurado</h1><p>Defina RD_STATION_CLIENT_ID na Vercel antes de iniciar a autorizacao.</p>',
      428
    )
  }

  if (setupSecret && receivedSetupSecret !== setupSecret) {
    return htmlResponse(
      '<h1>Acesso nao autorizado</h1><p>O parametro setup_secret nao confere com RD_STATION_OAUTH_SETUP_SECRET.</p>',
      401
    )
  }

  const callbackUrl = getCallbackUrl(request)
  const authUrl = new URL(RD_AUTH_DIALOG_URL)

  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', callbackUrl)

  if (setupSecret) {
    authUrl.searchParams.set('state', setupSecret)
  }

  return NextResponse.redirect(authUrl)
}
