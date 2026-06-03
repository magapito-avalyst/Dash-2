'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, Search, X } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type RDStationEmailCatalogItem = {
  id: string
  name: string
  type: string | null
  status: string | null
  sendAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

type RDStationEmailAnalytics = {
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

type ApiResponse<T> = {
  emails?: T[]
  error?: string
  message?: string
  status?: number
  details?: unknown
  authRequired?: string | string[]
  setupRequired?: boolean
  apiKeyConfigured?: boolean
}

export type RDStationEmailSummary = {
  contactsCount: number
  deliveredCount: number
  openedCount: number
  clickedCount: number
  bouncedCount: number
  droppedCount: number
  hardBouncedCount: number
  softBouncedCount: number
  unsubscribedCount: number
  spamReportedCount: number
  deliveredRate: number
  openedRate: number
  clickedRate: number
  bouncedRate: number
  hardBouncedRate: number
  softBouncedRate: number
  droppedRate: number
  unsubscribedRate: number
  spamReportedRate: number
}

type KpiKey = 'sent' | 'delivered' | 'opened' | 'clicked'
type ChartMode = 'rates' | 'volumes' | 'health'

type KpiCard = {
  key: KpiKey
  title: string
  rate: number
  count: number
  detail: string
  color: string
}

type ChartPayload = {
  payload?: {
    metric?: string
    [key: string]: unknown
  }
}

interface RDStationEmailAnalyticsProps {
  startDate: string
  endDate: string
  onSummaryChange?: (summary: RDStationEmailSummary | null) => void
}

const chartColors = [
  '#0ea5e9',
  '#8b5cf6',
  '#f97316',
  '#22c55e',
  '#ef4444',
  '#14b8a6',
  '#eab308',
  '#6366f1',
]

const chartModeLabels: Record<ChartMode, string> = {
  rates: 'Taxas',
  volumes: 'Volumes',
  health: 'Saude da base',
}

const activeMetricLabels: Record<KpiKey, string> = {
  sent: 'Emails enviados',
  delivered: 'Emails entregues',
  opened: 'Taxa de abertura',
  clicked: 'Taxa de cliques unicos',
}

function todayDateInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sem data'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function toDateInput(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/)
    return match?.[0] || null
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function compactLabel(value: string, size = 24) {
  if (value.length <= size) {
    return value
  }

  return `${value.slice(0, size - 3)}...`
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }

  return (numerator / denominator) * 100
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0)
}

function getCatalogKey(email: RDStationEmailCatalogItem) {
  return email.id
}

function getCampaignKey(email: RDStationEmailAnalytics) {
  return email.campaignId || `${email.campaignName}-${email.sendAt || 'sem-data'}`
}

function getNameKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatApiError<T>(payload: ApiResponse<T>) {
  const parts = [
    payload.error,
    payload.message && payload.message !== payload.error ? payload.message : null,
    payload.status ? `Status RD: ${payload.status}` : null,
  ].filter(Boolean)

  if (parts.length > 0) {
    return parts.join(' ')
  }

  if (payload.details) {
    return JSON.stringify(payload.details)
  }

  return 'Erro ao consultar dados da RD Station.'
}

function catalogToEmptyAnalytics(email: RDStationEmailCatalogItem): RDStationEmailAnalytics {
  return {
    campaignId: email.id,
    campaignName: email.name,
    sendAt: email.sendAt,
    contactsCount: 0,
    deliveredCount: 0,
    droppedCount: 0,
    bouncedCount: 0,
    hardBouncedCount: 0,
    softBouncedCount: 0,
    openedCount: 0,
    clickedCount: 0,
    unsubscribedCount: 0,
    spamReportedCount: 0,
    deliveredRate: 0,
    openedRate: 0,
    clickedRate: 0,
    bouncedRate: 0,
    droppedRate: 0,
    unsubscribedRate: 0,
    spamReportedRate: 0,
  }
}

function summarizeEmails(emails: RDStationEmailAnalytics[]): RDStationEmailSummary {
  const contactsCount = sumBy(emails, (email) => email.contactsCount)
  const deliveredCount = sumBy(emails, (email) => email.deliveredCount)
  const openedCount = sumBy(emails, (email) => email.openedCount)
  const clickedCount = sumBy(emails, (email) => email.clickedCount)
  const bouncedCount = sumBy(emails, (email) => email.bouncedCount)
  const droppedCount = sumBy(emails, (email) => email.droppedCount)
  const hardBouncedCount = sumBy(emails, (email) => email.hardBouncedCount)
  const softBouncedCount = sumBy(emails, (email) => email.softBouncedCount)
  const unsubscribedCount = sumBy(emails, (email) => email.unsubscribedCount)
  const spamReportedCount = sumBy(emails, (email) => email.spamReportedCount)

  return {
    contactsCount,
    deliveredCount,
    openedCount,
    clickedCount,
    bouncedCount,
    droppedCount,
    hardBouncedCount,
    softBouncedCount,
    unsubscribedCount,
    spamReportedCount,
    deliveredRate: percent(deliveredCount, contactsCount),
    openedRate: percent(openedCount, deliveredCount),
    clickedRate: percent(clickedCount, deliveredCount),
    bouncedRate: percent(bouncedCount, contactsCount),
    hardBouncedRate: percent(hardBouncedCount, contactsCount),
    softBouncedRate: percent(softBouncedCount, contactsCount),
    droppedRate: percent(droppedCount, contactsCount),
    unsubscribedRate: percent(unsubscribedCount, contactsCount),
    spamReportedRate: percent(spamReportedCount, contactsCount),
  }
}

function getSelectedAnalyticsRange(selectedEmails: RDStationEmailCatalogItem[]) {
  const today = todayDateInput()
  const sendDates = selectedEmails
    .map((email) => toDateInput(email.sendAt || email.createdAt || email.updatedAt))
    .filter((date): date is string => Boolean(date))
    .sort()

  if (sendDates.length === 0) {
    return {
      startDate: '2020-01-01',
      endDate: today,
    }
  }

  return {
    startDate: sendDates[0],
    endDate: sendDates[sendDates.length - 1] > today ? today : sendDates[sendDates.length - 1],
  }
}

function KpiSummaryCard({
  item,
  active,
  onClick,
}: {
  item: KpiCard
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-white p-5 text-center shadow-xs transition-colors',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        active && 'text-slate-950'
      )}
      style={{
        borderColor: active ? item.color : undefined,
        backgroundColor: active ? `${item.color}22` : undefined,
      }}
    >
      <div className="text-sm font-bold uppercase tracking-normal text-slate-700">
        {item.title}
      </div>
      <div className="mt-2 text-4xl font-bold text-slate-950">
        {formatPercent(item.rate)}
      </div>
      <div className="mt-1 text-lg text-slate-950">{formatNumber(item.count)}</div>
      <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
    </button>
  )
}

function MultiSeriesBarChart({
  data,
  series,
  format,
  height = 360,
}: {
  data: Array<Record<string, string | number>>
  series: Array<{ key: string; name: string; color: string }>
  format: 'number' | 'percent'
  height?: number
}) {
  const formatter = (value: number) => (
    format === 'percent' ? formatPercent(value) : formatNumber(value)
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="metric" tick={{ fontSize: 12 }} interval={0} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatter(Number(value))} />
        <Tooltip
          formatter={(value) => formatter(Number(value))}
          labelFormatter={(label, payload) => {
            const item = (payload?.[0] as ChartPayload | undefined)?.payload
            return String(item?.metric || label)
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.name}
            fill={item.color}
            radius={[6, 6, 0, 0]}
            maxBarSize={52}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RDStationEmailAnalytics({
  startDate,
  endDate,
  onSummaryChange,
}: RDStationEmailAnalyticsProps) {
  const [catalogEmails, setCatalogEmails] = useState<RDStationEmailCatalogItem[]>([])
  const [periodEmails, setPeriodEmails] = useState<RDStationEmailAnalytics[]>([])
  const [selectedAnalytics, setSelectedAnalytics] = useState<RDStationEmailAnalytics[]>([])
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [activeMetric, setActiveMetric] = useState<KpiKey>('opened')
  const [chartMode, setChartMode] = useState<ChartMode>('rates')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [isSelectionLoading, setIsSelectionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configMessage, setConfigMessage] = useState<string | null>(null)

  const fetchCatalog = useCallback(async (signal?: AbortSignal) => {
    setIsCatalogLoading(true)
    setError(null)
    setConfigMessage(null)

    try {
      const params = new URLSearchParams({
        page_size: '200',
        max_pages: '20',
      })
      const response = await fetch(`/api/rd-station/emails?${params.toString()}`, { signal })
      const payload = (await response.json()) as ApiResponse<RDStationEmailCatalogItem>

      if (!response.ok) {
        setError(formatApiError(payload))
        setCatalogEmails([])
        return
      }

      if (payload.setupRequired) {
        setConfigMessage(payload.message || payload.error || 'Integracao RD Station pendente.')
        setCatalogEmails([])
        return
      }

      setCatalogEmails(payload.emails || [])
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return
      }

      setError(fetchError instanceof Error ? fetchError.message : 'Erro desconhecido.')
      setCatalogEmails([])
    } finally {
      setIsCatalogLoading(false)
    }
  }, [])

  const fetchPeriodAnalytics = useCallback(async (signal?: AbortSignal) => {
    setIsAnalyticsLoading(true)

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await fetch(`/api/rd-station/email-analytics?${params.toString()}`, {
        signal,
      })
      const payload = (await response.json()) as ApiResponse<RDStationEmailAnalytics>

      if (!response.ok) {
        setError(formatApiError(payload))
        setPeriodEmails([])
        onSummaryChange?.(null)
        return
      }

      if (payload.setupRequired) {
        setConfigMessage(payload.message || payload.error || 'Integracao RD Station pendente.')
        setPeriodEmails([])
        onSummaryChange?.(null)
        return
      }

      const nextEmails = payload.emails || []

      setPeriodEmails(nextEmails)
      onSummaryChange?.(summarizeEmails(nextEmails))
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return
      }

      setError(fetchError instanceof Error ? fetchError.message : 'Erro desconhecido.')
      setPeriodEmails([])
      onSummaryChange?.(null)
    } finally {
      setIsAnalyticsLoading(false)
    }
  }, [endDate, onSummaryChange, startDate])

  const selectedCatalogEmails = useMemo(
    () => catalogEmails.filter((email) => selectedCampaigns.includes(getCatalogKey(email))),
    [catalogEmails, selectedCampaigns]
  )

  const fetchSelectedAnalytics = useCallback(async (signal?: AbortSignal) => {
    if (selectedCatalogEmails.length === 0) {
      setSelectedAnalytics([])
      return
    }

    setIsSelectionLoading(true)

    try {
      const range = getSelectedAnalyticsRange(selectedCatalogEmails)
      const params = new URLSearchParams({
        start_date: range.startDate,
        end_date: range.endDate,
      })

      for (const email of selectedCatalogEmails) {
        params.append('campaign_id', email.id)
      }

      const response = await fetch(`/api/rd-station/email-analytics?${params.toString()}`, {
        signal,
      })
      const payload = (await response.json()) as ApiResponse<RDStationEmailAnalytics>

      if (!response.ok) {
        setError(formatApiError(payload))
        setSelectedAnalytics([])
        return
      }

      if (payload.setupRequired) {
        setConfigMessage(payload.message || payload.error || 'Integracao RD Station pendente.')
        setSelectedAnalytics([])
        return
      }

      setSelectedAnalytics(payload.emails || [])
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return
      }

      setError(fetchError instanceof Error ? fetchError.message : 'Erro desconhecido.')
      setSelectedAnalytics([])
    } finally {
      setIsSelectionLoading(false)
    }
  }, [selectedCatalogEmails])

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      fetchCatalog(controller.signal)
    })

    return () => controller.abort()
  }, [fetchCatalog])

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      fetchPeriodAnalytics(controller.signal)
    })

    return () => controller.abort()
  }, [fetchPeriodAnalytics])

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      fetchSelectedAnalytics(controller.signal)
    })

    return () => controller.abort()
  }, [fetchSelectedAnalytics])

  const periodSummary = useMemo(() => summarizeEmails(periodEmails), [periodEmails])

  const analyticsLookup = useMemo(() => {
    const byId = new Map<string, RDStationEmailAnalytics>()
    const byName = new Map<string, RDStationEmailAnalytics>()

    for (const email of selectedAnalytics) {
      byId.set(getCampaignKey(email), email)
      byName.set(getNameKey(email.campaignName), email)
    }

    return { byId, byName }
  }, [selectedAnalytics])

  const selectedEmails = useMemo(() => (
    selectedCatalogEmails.map((catalogEmail) => (
      analyticsLookup.byId.get(catalogEmail.id) ||
      analyticsLookup.byName.get(getNameKey(catalogEmail.name)) ||
      catalogToEmptyAnalytics(catalogEmail)
    ))
  ), [analyticsLookup, selectedCatalogEmails])

  const selectedSummary = useMemo(() => summarizeEmails(selectedEmails), [selectedEmails])
  const summaryForCards = selectedEmails.length > 0 ? selectedSummary : periodSummary
  const selectedTypes = useMemo(
    () => Array.from(new Set(
      catalogEmails.map((email) => email.type).filter((value): value is string => Boolean(value))
    )).sort(),
    [catalogEmails]
  )
  const selectedStatuses = useMemo(
    () => Array.from(new Set(
      catalogEmails.map((email) => email.status).filter((value): value is string => Boolean(value))
    )).sort(),
    [catalogEmails]
  )

  const filteredCatalog = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return catalogEmails.filter((email) => {
      const matchesSearch = normalizedSearch
        ? `${email.name} ${email.id}`.toLowerCase().includes(normalizedSearch)
        : true
      const matchesType = typeFilter === 'all' || email.type === typeFilter
      const matchesStatus = statusFilter === 'all' || email.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    }).sort((a, b) => (
      String(b.sendAt || b.createdAt || '').localeCompare(String(a.sendAt || a.createdAt || ''))
    ))
  }, [catalogEmails, searchTerm, statusFilter, typeFilter])

  const selectableCatalog = filteredCatalog.filter((email) => !selectedCampaigns.includes(email.id))

  const kpis: KpiCard[] = useMemo(
    () => [
      {
        key: 'sent',
        title: 'Emails enviados',
        rate: summaryForCards.contactsCount > 0 ? 100 : 0,
        count: summaryForCards.contactsCount,
        detail: selectedEmails.length > 0 ? 'total selecionado' : 'periodo do topo',
        color: chartColors[0],
      },
      {
        key: 'delivered',
        title: 'Emails entregues',
        rate: summaryForCards.deliveredRate,
        count: summaryForCards.deliveredCount,
        detail: `${formatNumber(summaryForCards.bouncedCount)} bounces`,
        color: chartColors[3],
      },
      {
        key: 'opened',
        title: 'Taxa de abertura',
        rate: summaryForCards.openedRate,
        count: summaryForCards.openedCount,
        detail: `${formatNumber(summaryForCards.deliveredCount)} entregues`,
        color: chartColors[1],
      },
      {
        key: 'clicked',
        title: 'Taxa de cliques unicos',
        rate: summaryForCards.clickedRate,
        count: summaryForCards.clickedCount,
        detail: `${formatNumber(summaryForCards.openedCount)} aberturas`,
        color: chartColors[2],
      },
    ],
    [selectedEmails.length, summaryForCards]
  )

  const series = useMemo(
    () => selectedEmails.map((email, index) => ({
      key: `email_${index}`,
      name: compactLabel(email.campaignName, 28),
      color: chartColors[index % chartColors.length],
    })),
    [selectedEmails]
  )

  const chartData = useMemo(() => {
    const baseMetrics = chartMode === 'rates'
      ? [
          { metric: 'Entrega', selector: (email: RDStationEmailAnalytics) => email.deliveredRate },
          { metric: 'Abertura', selector: (email: RDStationEmailAnalytics) => email.openedRate },
          { metric: 'Cliques', selector: (email: RDStationEmailAnalytics) => email.clickedRate },
          { metric: 'Bounces', selector: (email: RDStationEmailAnalytics) => email.bouncedRate },
          { metric: 'Spam', selector: (email: RDStationEmailAnalytics) => email.spamReportedRate },
          { metric: 'Descadastro', selector: (email: RDStationEmailAnalytics) => email.unsubscribedRate },
        ]
      : chartMode === 'volumes'
        ? [
            { metric: 'Enviados', selector: (email: RDStationEmailAnalytics) => email.contactsCount },
            { metric: 'Entregues', selector: (email: RDStationEmailAnalytics) => email.deliveredCount },
            { metric: 'Aberturas', selector: (email: RDStationEmailAnalytics) => email.openedCount },
            { metric: 'Cliques', selector: (email: RDStationEmailAnalytics) => email.clickedCount },
            { metric: 'Bounces', selector: (email: RDStationEmailAnalytics) => email.bouncedCount },
          ]
        : [
            { metric: 'Engajados', selector: (email: RDStationEmailAnalytics) => email.openedCount },
            { metric: 'Indeterminados', selector: (email: RDStationEmailAnalytics) => Math.max(email.deliveredCount - email.openedCount, 0) },
            { metric: 'Descartados', selector: (email: RDStationEmailAnalytics) => email.droppedCount },
            { metric: 'Hard bounce', selector: (email: RDStationEmailAnalytics) => email.hardBouncedCount },
            { metric: 'Soft bounce', selector: (email: RDStationEmailAnalytics) => email.softBouncedCount },
            { metric: 'Spam', selector: (email: RDStationEmailAnalytics) => email.spamReportedCount },
            { metric: 'Descadastro', selector: (email: RDStationEmailAnalytics) => email.unsubscribedCount },
          ]

    return baseMetrics.map((metric) => {
      const row: Record<string, string | number> = {
        metric: metric.metric,
      }

      selectedEmails.forEach((email, index) => {
        row[`email_${index}`] = metric.selector(email)
      })

      return row
    })
  }, [chartMode, selectedEmails])

  const addCampaign = (campaignId: string) => {
    if (!campaignId) {
      return
    }

    setSelectedCampaigns((current) => (
      current.includes(campaignId) ? current : [...current, campaignId].slice(0, 8)
    ))
  }

  const removeCampaign = (campaignId: string) => {
    setSelectedCampaigns((current) => current.filter((id) => id !== campaignId))
  }

  const clearSelection = () => {
    setSelectedCampaigns([])
  }

  const selectVisible = () => {
    setSelectedCampaigns(filteredCatalog.slice(0, 8).map((email) => email.id))
  }

  const isLoading = isCatalogLoading || isAnalyticsLoading || isSelectionLoading
  const chartFormat = chartMode === 'rates' ? 'percent' : 'number'

  return (
    <section className="mb-8 space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base font-medium">RD Station - E-mail Marketing</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Catalogo completo de disparos. Indicadores do topo: {startDate} a {endDate}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                fetchCatalog()
                fetchPeriodAnalytics()
                fetchSelectedAnalytics()
              }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_minmax(260px,1fr)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar disparo por nome ou ID"
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {selectedTypes.map((type) => (
                  <SelectItem key={type} value={type || 'sem-tipo'}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {selectedStatuses.map((status) => (
                  <SelectItem key={status} value={status || 'sem-status'}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value="" onValueChange={addCampaign}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Adicionar disparo para comparar" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {selectableCatalog.length > 0 ? (
                  selectableCatalog.map((email) => (
                    <SelectItem key={email.id} value={email.id}>
                      {compactLabel(email.name, 60)} - {formatDate(email.sendAt)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>
                    Nenhum disparo disponivel
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectVisible}>
              Selecionar visiveis
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              Limpar
            </Button>
            <Badge variant="outline">{catalogEmails.length} disparos no catalogo</Badge>
            <Badge variant="outline">{selectedCampaigns.length} selecionado(s)</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {configMessage && (
            <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Integracao RD Station pendente</p>
                <p className="mt-1">{configMessage}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Erro ao carregar dados da RD Station</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {!configMessage && !error && selectedCatalogEmails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCatalogEmails.map((email, index) => (
                <span
                  key={email.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow-xs"
                  style={{ borderColor: chartColors[index % chartColors.length] }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  <span className="truncate">{email.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(email.sendAt)}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => removeCampaign(email.id)}
                    aria-label={`Remover ${email.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {!configMessage && !error && catalogEmails.length === 0 && !isCatalogLoading && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum disparo encontrado no catalogo da RD Station.
            </div>
          )}
        </CardContent>
      </Card>

      {!configMessage && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiSummaryCard
              key={item.key}
              item={item}
              active={activeMetric === item.key}
              onClick={() => setActiveMetric(item.key)}
            />
          ))}
        </div>
      )}

      {!configMessage && !error && selectedEmails.length > 0 && (
        <>
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base font-medium">
                    Comparativo por disparo - {chartModeLabels[chartMode]}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cada cor representa um disparo selecionado. Os valores nao sao somados no grafico comparativo.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={chartMode} onValueChange={(value) => setChartMode(value as ChartMode)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Grafico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rates">Taxas</SelectItem>
                      <SelectItem value="volumes">Volumes</SelectItem>
                      <SelectItem value="health">Saude da base</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={activeMetric} onValueChange={(value) => setActiveMetric(value as KpiKey)}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Card em destaque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">{activeMetricLabels.sent}</SelectItem>
                      <SelectItem value="delivered">{activeMetricLabels.delivered}</SelectItem>
                      <SelectItem value="opened">{activeMetricLabels.opened}</SelectItem>
                      <SelectItem value="clicked">{activeMetricLabels.clicked}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MultiSeriesBarChart
                data={chartData}
                series={series}
                format={chartFormat}
                height={selectedEmails.length > 4 ? 430 : 360}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {selectedEmails.map((email, index) => (
              <Card key={getCampaignKey(email)}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                    />
                    <div>
                      <CardTitle className="text-sm font-medium">{email.campaignName}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(email.sendAt)} - {formatNumber(email.contactsCount)} enviados
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground">Entrega</p>
                      <p className="mt-1 text-lg font-semibold">{formatPercent(email.deliveredRate)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground">Abertura</p>
                      <p className="mt-1 text-lg font-semibold">{formatPercent(email.openedRate)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground">Cliques</p>
                      <p className="mt-1 text-lg font-semibold">{formatPercent(email.clickedRate)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground">Bounces</p>
                      <p className="mt-1 text-lg font-semibold">{formatPercent(email.bouncedRate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!configMessage && !error && selectedEmails.length === 0 && catalogEmails.length > 0 && (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
          Selecione um ou mais disparos no menu para comparar campanhas.
        </div>
      )}
    </section>
  )
}
