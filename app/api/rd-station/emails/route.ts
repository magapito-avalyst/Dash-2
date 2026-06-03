import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RD_API_BASE_URL = 'https://api.rd.services'

type RawObject = Record<string, unknown>

type TokenResolution = {
  accessToken: string
  source: 'env' | 'refresh'
}

function isRecord(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickString(source: RawObject, keys: string[]) {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'string' && value.trim()) {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ''
}

function pickArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }

  if (!isRecord(payload)) {
    return []
  }

  for (const key of ['emails', 'data', 'items', 'results']) {
    const value = payload[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value) && Array.isArray(value.emails)) {
      return value.emails.filter(isRecord)
    }
  }

  return []
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === 'string') {
    return payload
  }

  if (!isRecord(payload)) {
    return ''
  }

  for (const key of ['message', 'error', 'error_description', 'errors', 'details']) {
    const value = payload[key]

    if (typeof value === 'string' && value.trim()) {
      return value
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join(' ')
    }
  }

  return JSON.stringify(payload)
}

function looksLikeApiKey(value: string) {
  return !value.includes('.') && value.length >= 30
}

function normalizeCatalogEmail(email: RawObject) {
  const id = pickString(email, ['id', 'email_id', 'campaign_id', 'asset_id'])
  const name = pickString(email, ['name', 'title', 'campaign_name', 'subject']) || `Email ${id}`

  return {
    id,
    name,
    type: pickString(email, ['type', 'email_type']) || null,
    status: pickString(email, ['status', 'state']) || null,
    sendAt: pickString(email, ['send_at', 'sent_at', 'scheduled_at', 'published_at']) || null,
    createdAt: pickString(email, ['created_at', 'createdAt']) || null,
    updatedAt: pickString(email, ['updated_at', 'updatedAt']) || null,
  }
}

async function readJsonOrText(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function hasRefreshTokenConfig() {
  return Boolean(
    process.env.RD_STATION_CLIENT_ID &&
      process.env.RD_STATION_CLIENT_SECRET &&
      process.env.RD_STATION_REFRESH_TOKEN
  )
}

async function refreshAccessToken() {
  const clientId = process.env.RD_STATION_CLIENT_ID
  const clientSecret = process.env.RD_STATION_CLIENT_SECRET
  const refreshToken = process.env.RD_STATION_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  const response = await fetch(`${RD_API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })
  const payload = await readJsonOrText(response)

  if (!response.ok || !isRecord(payload) || typeof payload.access_token !== 'string') {
    throw new Error('Nao foi possivel renovar o access_token da RD Station.')
  }

  return payload.access_token
}

async function resolveAccessToken(): Promise<TokenResolution | null> {
  if (process.env.RD_STATION_ACCESS_TOKEN) {
    if (looksLikeApiKey(process.env.RD_STATION_ACCESS_TOKEN) && !hasRefreshTokenConfig()) {
      return null
    }

    return {
      accessToken: process.env.RD_STATION_ACCESS_TOKEN,
      source: 'env',
    }
  }

  const refreshedAccessToken = await refreshAccessToken()

  if (!refreshedAccessToken) {
    return null
  }

  return {
    accessToken: refreshedAccessToken,
    source: 'refresh',
  }
}

async function fetchCatalogPage(
  page: number,
  pageSize: number,
  query: string,
  accessToken: string
) {
  const url = new URL(`${RD_API_BASE_URL}/platform/emails`)

  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(pageSize))

  if (query) {
    url.searchParams.set('query', query)
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  const payload = await readJsonOrText(response)

  return { response, payload }
}

export async function GET(request: NextRequest) {
  let tokenResolution: TokenResolution | null = null

  try {
    tokenResolution = await resolveAccessToken()
  } catch (tokenError) {
    return NextResponse.json(
      {
        error: 'Nao foi possivel obter um access_token da RD Station.',
        details: tokenError instanceof Error ? tokenError.message : 'Erro desconhecido',
      },
      { status: 502 }
    )
  }

  if (!tokenResolution) {
    return NextResponse.json({
      setupRequired: true,
      error: 'OAuth RD Station nao configurado',
      message:
        'A listagem de e-mails da RD Station exige OAuth2/Bearer token. A API Key serve apenas para eventos de conversao.',
    })
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() || ''
  const requestedPageSize = Number(request.nextUrl.searchParams.get('page_size') || 200)
  const requestedMaxPages = Number(request.nextUrl.searchParams.get('max_pages') || 10)
  const pageSize = Math.min(Math.max(requestedPageSize, 1), 200)
  const maxPages = Math.min(Math.max(requestedMaxPages, 1), 20)
  const emails = new Map<string, ReturnType<typeof normalizeCatalogEmail>>()
  let lastStatus = 200
  let lastPayload: unknown = null

  for (let page = 1; page <= maxPages; page += 1) {
    const { response, payload } = await fetchCatalogPage(
      page,
      pageSize,
      query,
      tokenResolution.accessToken
    )

    if (!response.ok) {
      const rdMessage = extractErrorMessage(payload)

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({
          setupRequired: true,
          error: 'OAuth RD Station invalido ou sem permissao',
          status: response.status,
          details: payload,
          message:
            `A RD Station recusou a autenticacao (${response.status}). Use um access_token OAuth2 valido ou configure client_id, client_secret e refresh_token. ${rdMessage}`.trim(),
        })
      }

      return NextResponse.json(
        {
          error: 'RD Station retornou erro ao listar e-mails.',
          status: response.status,
          details: payload,
          message: rdMessage,
        },
        { status: response.status }
      )
    }

    const pageEmails = pickArray(payload)
      .map(normalizeCatalogEmail)
      .filter((email) => email.id && email.name)

    for (const email of pageEmails) {
      emails.set(email.id, email)
    }

    lastStatus = response.status
    lastPayload = payload

    if (pageEmails.length < pageSize) {
      break
    }
  }

  return NextResponse.json({
    source: 'rd-station',
    status: lastStatus,
    count: emails.size,
    query,
    emails: Array.from(emails.values()),
    rawPageInfo: isRecord(lastPayload) ? {
      page: lastPayload.page ?? null,
      total: lastPayload.total ?? null,
      totalPages: lastPayload.total_pages ?? lastPayload.totalPages ?? null,
    } : null,
  })
}
