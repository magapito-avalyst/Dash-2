import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RD_API_BASE_URL = 'https://api.rd.services'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type RawObject = Record<string, unknown>

type TokenResolution = {
  accessToken: string
  source: 'env' | 'refresh'
}

type NormalizedEmailAnalytics = {
  campaignId: string
  campaignName: string
  sendAt: string | null
  contactsCount: number
  deliveredCount: number
  droppedCount: number
  bouncedCount: number
  hardBouncedCount: number
  softBouncedCount: number
  openedCount: number
  clickedCount: number
  unsubscribedCount: number
  spamReportedCount: number
  deliveredRate: number
  openedRate: number
  clickedRate: number
  bouncedRate: number
  droppedRate: number
  unsubscribedRate: number
  spamReportedRate: number
}

function isRecord(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.')
    const parsed = Number(normalized)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function pickNumber(source: RawObject, keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return toNumber(source[key])
    }
  }

  return 0
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

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }

  return (numerator / denominator) * 100
}

function normalizeEmailAnalytics(email: RawObject): NormalizedEmailAnalytics {
  const contactsCount = pickNumber(email, ['contacts_count', 'contactsCount', 'sent_count', 'sentCount'])
  const deliveredCount = pickNumber(email, [
    'email_delivered_count',
    'emailDeliveredCount',
    'delivered_count',
    'deliveredCount',
  ])
  const droppedCount = pickNumber(email, [
    'email_dropped_count',
    'emailDroppedCount',
    'dropped_count',
    'droppedCount',
  ])
  const bouncedCount = pickNumber(email, [
    'email_bounced_count',
    'emailBouncedCount',
    'bounced_count',
    'bouncedCount',
  ])
  const hardBouncedCount = pickNumber(email, [
    'email_hard_bounced_count',
    'emailHardBouncedCount',
    'hard_bounced_count',
    'hardBouncedCount',
  ])
  const softBouncedCount = pickNumber(email, [
    'email_soft_bounced_count',
    'emailSoftBouncedCount',
    'soft_bounced_count',
    'softBouncedCount',
  ])
  const openedCount = pickNumber(email, [
    'email_opened_count',
    'emailOpenedCount',
    'opened_count',
    'openedCount',
  ])
  const clickedCount = pickNumber(email, [
    'email_clicked_count',
    'emailClickedCount',
    'clicked_count',
    'clickedCount',
  ])
  const unsubscribedCount = pickNumber(email, [
    'email_unsubscribed_count',
    'emailUnsubscribedCount',
    'unsubscribed_count',
    'unsubscribedCount',
  ])
  const spamReportedCount = pickNumber(email, [
    'email_spam_reported_count',
    'emailSpamReportedCount',
    'spam_reported_count',
    'spamReportedCount',
  ])
  const deliveredRate = pickNumber(email, [
    'email_delivered_rate',
    'emailDeliveredRate',
    'delivered_rate',
    'deliveredRate',
  ]) || percent(deliveredCount, contactsCount)
  const openedRate = pickNumber(email, [
    'email_opened_rate',
    'emailOpenedRate',
    'opened_rate',
    'openedRate',
  ]) || percent(openedCount, deliveredCount)
  const clickedRate = pickNumber(email, [
    'email_clicked_rate',
    'emailClickedRate',
    'clicked_rate',
    'clickedRate',
  ]) || percent(clickedCount, deliveredCount)
  const campaignId = pickString(email, ['campaign_id', 'campaignId', 'id'])

  return {
    campaignId,
    campaignName: pickString(email, ['campaign_name', 'campaignName', 'name', 'title']) || `Email ${campaignId}`,
    sendAt: pickString(email, ['send_at', 'sendAt', 'sent_at', 'sentAt']) || null,
    contactsCount,
    deliveredCount,
    droppedCount,
    bouncedCount,
    hardBouncedCount,
    softBouncedCount,
    openedCount,
    clickedCount,
    unsubscribedCount,
    spamReportedCount,
    deliveredRate,
    openedRate,
    clickedRate,
    bouncedRate: percent(bouncedCount, contactsCount),
    droppedRate: percent(droppedCount, contactsCount),
    unsubscribedRate: percent(unsubscribedCount, contactsCount),
    spamReportedRate: pickNumber(email, [
      'email_spam_reported_rate',
      'emailSpamReportedRate',
      'spam_reported_rate',
      'spamReportedRate',
    ]) || percent(spamReportedCount, contactsCount),
  }
}

function extractEmails(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }

  if (!isRecord(payload)) {
    return []
  }

  const emails = payload.emails

  if (Array.isArray(emails)) {
    return emails.filter(isRecord)
  }

  const data = payload.data

  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }

  if (isRecord(data) && Array.isArray(data.emails)) {
    return data.emails.filter(isRecord)
  }

  return []
}

function buildAnalyticsUrl(request: NextRequest) {
  const url = new URL(`${RD_API_BASE_URL}/platform/analytics/emails`)
  const startDate = request.nextUrl.searchParams.get('start_date')
  const endDate = request.nextUrl.searchParams.get('end_date')

  if (!startDate || !DATE_PATTERN.test(startDate)) {
    return {
      error: 'Parametro start_date ausente ou invalido. Use yyyy-mm-dd.',
      url,
    }
  }

  if (!endDate || !DATE_PATTERN.test(endDate)) {
    return {
      error: 'Parametro end_date ausente ou invalido. Use yyyy-mm-dd.',
      url,
    }
  }

  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)

  const campaignIds = [
    ...request.nextUrl.searchParams.getAll('campaign_id'),
    ...(request.nextUrl.searchParams.get('campaign_ids') || '').split(','),
  ]

  for (const campaignId of campaignIds) {
    const normalizedId = campaignId.trim()

    if (/^\d+$/.test(normalizedId)) {
      url.searchParams.append('campaign_id', normalizedId)
    }
  }

  return { url }
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

async function fetchAnalytics(url: URL, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })
  const payload = await readJsonOrText(response)

  return { response, payload }
}

export async function GET(request: NextRequest) {
  const hasApiKey = Boolean(process.env.RD_STATION_API_KEY)
  const { url, error } = buildAnalyticsUrl(request)

  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

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
    return NextResponse.json(
      {
        setupRequired: true,
        error: 'OAuth RD Station nao configurado',
        authRequired: [
          'RD_STATION_ACCESS_TOKEN',
          'ou RD_STATION_CLIENT_ID + RD_STATION_CLIENT_SECRET + RD_STATION_REFRESH_TOKEN',
        ],
        apiKeyConfigured: hasApiKey,
        message:
          'As estatisticas de E-mail Marketing da RD Station exigem OAuth2/Bearer token. A API Key serve apenas para eventos de conversao.',
      },
      { status: 200 }
    )
  }

  try {
    let { response, payload } = await fetchAnalytics(url, tokenResolution.accessToken)

    if (response.status === 401 && tokenResolution.source === 'env' && hasRefreshTokenConfig()) {
      const refreshedAccessToken = await refreshAccessToken()

      if (refreshedAccessToken) {
        const retry = await fetchAnalytics(url, refreshedAccessToken)

        response = retry.response
        payload = retry.payload
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'RD Station retornou erro ao consultar estatisticas de e-mail.',
          status: response.status,
          details: payload,
        },
        { status: response.status }
      )
    }

    const emails = extractEmails(payload)
      .map(normalizeEmailAnalytics)
      .filter((email) => email.campaignId || email.campaignName)

    return NextResponse.json({
      source: 'rd-station',
      accountId: isRecord(payload) ? payload.account_id ?? null : null,
      queryDate: isRecord(payload) ? payload.query_date ?? null : null,
      emails,
      count: emails.length,
    })
  } catch (fetchError) {
    return NextResponse.json(
      {
        error: 'Nao foi possivel conectar na API da RD Station.',
        details: fetchError instanceof Error ? fetchError.message : 'Erro desconhecido',
      },
      { status: 502 }
    )
  }
}
