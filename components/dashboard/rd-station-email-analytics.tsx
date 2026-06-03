'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Loader2, RefreshCw, Search } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

type RDStationEmailAnalyticsResponse = {
  emails?: RDStationEmailAnalytics[]
  error?: string
  message?: string
  authRequired?: string | string[]
  setupRequired?: boolean
  apiKeyConfigured?: boolean
}

type KpiKey = 'sent' | 'delivered' | 'opened' | 'clicked'

type KpiCard = {
  key: KpiKey
  title: string
  rate: number
  count: number
}

type ChartValueFormat = 'number' | 'percent'

type ChartPayload = {
  payload?: {
    label?: string
    count?: number
  }
}

interface RDStationEmailAnalyticsProps {
  startDate: string
  endDate: string
}

const activeMetricLabels: Record<KpiKey, string> = {
  sent: 'Emails enviados',
  delivered: 'Emails entregues',
  opened: 'Taxa de abertura',
  clicked: 'Taxa de cliques unicos',
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

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0)
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }

  return (numerator / denominator) * 100
}

function compactLabel(value: string) {
  if (value.length <= 22) {
    return value
  }

  return `${value.slice(0, 20)}...`
}

function getCampaignKey(email: RDStationEmailAnalytics) {
  return email.campaignId || `${email.campaignName}-${email.sendAt || 'sem-data'}`
}

function getActiveMetricValue(email: RDStationEmailAnalytics, activeMetric: KpiKey) {
  switch (activeMetric) {
    case 'sent':
      return email.contactsCount
    case 'delivered':
      return email.deliveredRate
    case 'opened':
      return email.openedRate
    case 'clicked':
      return email.clickedRate
    default:
      return 0
  }
}

function getChartFormatter(format: ChartValueFormat) {
  return (value: number) => (format === 'percent' ? formatPercent(value) : formatNumber(value))
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
        active && 'border-cyan-500 bg-cyan-400 text-slate-950'
      )}
    >
      <div className="text-sm font-bold uppercase tracking-normal text-slate-700">
        {item.title}
      </div>
      <div className="mt-2 text-4xl font-bold text-slate-950">
        {formatPercent(item.rate)}
      </div>
      <div className="mt-1 text-lg text-slate-950">{formatNumber(item.count)}</div>
    </button>
  )
}

function SimpleBarChart({
  data,
  dataKey,
  format,
  height = 320,
}: {
  data: Array<{ label: string; value: number; count?: number }>
  dataKey: string
  format: ChartValueFormat
  height?: number
}) {
  const formatter = getChartFormatter(format)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 20, bottom: 12, left: 0 }}>
        <CartesianGrid stroke="#d9d9d9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => formatter(Number(value))}
          labelFormatter={(label, payload) => {
            const item = (payload?.[0] as ChartPayload | undefined)?.payload
            const count = typeof item?.count === 'number' ? ` - ${formatNumber(item.count)}` : ''

            return `${String(label)}${count}`
          }}
        />
        <Bar dataKey={dataKey} fill="#8f0bdd" radius={[7, 7, 7, 7]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RDStationEmailAnalytics({
  startDate,
  endDate,
}: RDStationEmailAnalyticsProps) {
  const [emails, setEmails] = useState<RDStationEmailAnalytics[]>([])
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [activeMetric, setActiveMetric] = useState<KpiKey>('sent')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configMessage, setConfigMessage] = useState<string | null>(null)

  const fetchAnalytics = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)
      setConfigMessage(null)

      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        })
        const response = await fetch(`/api/rd-station/email-analytics?${params.toString()}`, {
          signal,
        })
        const payload = (await response.json()) as RDStationEmailAnalyticsResponse

        if (!response.ok) {
          if (payload.authRequired) {
            setConfigMessage(payload.message || payload.error || 'Integracao RD Station pendente.')
          } else {
            setError(payload.message || payload.error || 'Erro ao consultar dados da RD Station.')
          }

          setEmails([])
          setSelectedCampaigns([])
          return
        }

        if (payload.setupRequired) {
          setConfigMessage(payload.message || payload.error || 'Integracao RD Station pendente.')
          setEmails([])
          setSelectedCampaigns([])
          return
        }

        const nextEmails = payload.emails || []

        setEmails(nextEmails)
        setSelectedCampaigns((current) => {
          const availableKeys = nextEmails.map(getCampaignKey)
          const validCurrent = current.filter((key) => availableKeys.includes(key))

          if (validCurrent.length > 0) {
            return validCurrent
          }

          return availableKeys.slice(0, Math.min(3, availableKeys.length))
        })
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Erro desconhecido.')
        setEmails([])
        setSelectedCampaigns([])
      } finally {
        setIsLoading(false)
      }
    },
    [endDate, startDate]
  )

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      fetchAnalytics(controller.signal)
    })

    return () => controller.abort()
  }, [fetchAnalytics])

  const filteredEmails = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return emails
    }

    return emails.filter((email) =>
      `${email.campaignName} ${email.campaignId}`.toLowerCase().includes(normalizedSearch)
    )
  }, [emails, searchTerm])

  const selectedEmails = useMemo(
    () => emails.filter((email) => selectedCampaigns.includes(getCampaignKey(email))),
    [emails, selectedCampaigns]
  )

  const totals = useMemo(() => {
    const contactsCount = sumBy(selectedEmails, (email) => email.contactsCount)
    const deliveredCount = sumBy(selectedEmails, (email) => email.deliveredCount)
    const openedCount = sumBy(selectedEmails, (email) => email.openedCount)
    const clickedCount = sumBy(selectedEmails, (email) => email.clickedCount)
    const bouncedCount = sumBy(selectedEmails, (email) => email.bouncedCount)
    const droppedCount = sumBy(selectedEmails, (email) => email.droppedCount)
    const hardBouncedCount = sumBy(selectedEmails, (email) => email.hardBouncedCount)
    const softBouncedCount = sumBy(selectedEmails, (email) => email.softBouncedCount)
    const unsubscribedCount = sumBy(selectedEmails, (email) => email.unsubscribedCount)
    const spamReportedCount = sumBy(selectedEmails, (email) => email.spamReportedCount)

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
    }
  }, [selectedEmails])

  const kpis: KpiCard[] = useMemo(
    () => [
      {
        key: 'sent',
        title: 'Emails enviados',
        rate: totals.contactsCount > 0 ? 100 : 0,
        count: totals.contactsCount,
      },
      {
        key: 'delivered',
        title: 'Emails entregues',
        rate: totals.deliveredRate,
        count: totals.deliveredCount,
      },
      {
        key: 'opened',
        title: 'Taxa de abertura',
        rate: totals.openedRate,
        count: totals.openedCount,
      },
      {
        key: 'clicked',
        title: 'Taxa de cliques unicos',
        rate: totals.clickedRate,
        count: totals.clickedCount,
      },
    ],
    [totals]
  )

  const comparisonData = useMemo(
    () =>
      selectedEmails.map((email) => ({
        label: compactLabel(email.campaignName),
        value: getActiveMetricValue(email, activeMetric),
        count:
          activeMetric === 'sent'
            ? email.contactsCount
            : activeMetric === 'delivered'
              ? email.deliveredCount
              : activeMetric === 'opened'
                ? email.openedCount
                : email.clickedCount,
      })),
    [activeMetric, selectedEmails]
  )

  const engagementData = useMemo(() => {
    const engaged = totals.openedCount
    const undetermined = Math.max(totals.deliveredCount - totals.openedCount, 0)
    const disengaged = totals.unsubscribedCount + totals.spamReportedCount
    const invalid = totals.bouncedCount + totals.droppedCount
    const denominator = totals.contactsCount

    return [
      { label: 'Engajados', value: percent(engaged, denominator), count: engaged },
      { label: 'Indeterminados', value: percent(undetermined, denominator), count: undetermined },
      { label: 'Desengajados', value: percent(disengaged, denominator), count: disengaged },
      { label: 'Invalidos', value: percent(invalid, denominator), count: invalid },
    ]
  }, [totals])

  const bounceData = useMemo(
    () => [
      { label: 'Email descartado', value: percent(totals.droppedCount, totals.contactsCount), count: totals.droppedCount },
      { label: 'Hard Bounces', value: percent(totals.hardBouncedCount, totals.contactsCount), count: totals.hardBouncedCount },
      { label: 'Soft Bounces', value: percent(totals.softBouncedCount, totals.contactsCount), count: totals.softBouncedCount },
      { label: 'Total de Bounces', value: percent(totals.bouncedCount, totals.contactsCount), count: totals.bouncedCount },
      { label: 'Marcou como spam', value: percent(totals.spamReportedCount, totals.contactsCount), count: totals.spamReportedCount },
      { label: 'Descadastrou', value: percent(totals.unsubscribedCount, totals.contactsCount), count: totals.unsubscribedCount },
    ],
    [totals]
  )

  const toggleCampaign = (campaignKey: string) => {
    setSelectedCampaigns((current) => {
      if (current.includes(campaignKey)) {
        return current.filter((key) => key !== campaignKey)
      }

      return [...current, campaignKey]
    })
  }

  const selectAllFiltered = () => {
    setSelectedCampaigns(filteredEmails.map(getCampaignKey))
  }

  const clearSelection = () => {
    setSelectedCampaigns([])
  }

  return (
    <section className="mb-8 space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base font-medium">RD Station - E-mail Marketing</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Campanhas enviadas entre {startDate} e {endDate}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchAnalytics()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:max-w-sm md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar email"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                Selecionar visiveis
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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

          {!configMessage && !error && emails.length === 0 && !isLoading && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum disparo de e-mail encontrado no periodo selecionado.
            </div>
          )}

          {!configMessage && !error && emails.length > 0 && (
            <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredEmails.map((email) => {
                const campaignKey = getCampaignKey(email)
                const selected = selectedCampaigns.includes(campaignKey)

                return (
                  <button
                    key={campaignKey}
                    type="button"
                    onClick={() => toggleCampaign(campaignKey)}
                    className={cn(
                      'flex min-h-20 items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                      selected ? 'border-cyan-500 bg-cyan-50' : 'bg-white hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-cyan-600 bg-cyan-500 text-white' : 'border-slate-300'
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{email.campaignName}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDate(email.sendAt)} - {formatNumber(email.contactsCount)} enviados
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!configMessage && !error && selectedEmails.length > 0 && (
        <>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Comparativo por email - {activeMetricLabels[activeMetric]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={comparisonData}
                dataKey="value"
                format={activeMetric === 'sent' ? 'number' : 'percent'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Distribuicao de engajamento</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={engagementData} dataKey="value" format="percent" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Bounces e descadastros</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={bounceData} dataKey="value" format="percent" />
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
