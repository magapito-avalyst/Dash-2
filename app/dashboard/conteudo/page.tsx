'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth } from 'date-fns'
import { Plus, Mail, Search, Instagram, Linkedin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { DateFilter, CompareMode, getComparisonDates } from '@/components/dashboard/date-filter'
import { ContentFormDialog } from '@/components/dashboard/content-form-dialog'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'
import {
  MetricOrderControl,
  type OrderedMetricOption,
} from '@/components/dashboard/metric-order-control'
import { RDStationEmailAnalytics } from '@/components/dashboard/rd-station-email-analytics'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ContentMetric } from '@/lib/types'
import { Pencil, Trash2 } from 'lucide-react'
import { calculateTrend, sum } from '@/lib/dashboard-metrics'

export default function ConteudoPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [compareMode, setCompareMode] = useState<CompareMode>('month')
  const [metrics, setMetrics] = useState<ContentMetric[]>([])
  const [compareMetrics, setCompareMetrics] = useState<ContentMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<ContentMetric | null>(null)
  const [activeChannel, setActiveChannel] = useState('email_marketing')

  const fetchMetrics = useCallback(async () => {
    const supabase = createClient()
    const { currentStart, currentEnd, compareStart, compareEnd } = getComparisonDates(
      selectedMonth,
      compareMode
    )

    setIsLoading(true)

    const { data: currentData } = await supabase
      .from('content_metrics')
      .select('*')
      .gte('reference_date', currentStart.toISOString().split('T')[0])
      .lte('reference_date', currentEnd.toISOString().split('T')[0])

    const { data: previousData } = await supabase
      .from('content_metrics')
      .select('*')
      .gte('reference_date', compareStart.toISOString().split('T')[0])
      .lte('reference_date', compareEnd.toISOString().split('T')[0])

    setMetrics(currentData || [])
    setCompareMetrics(previousData || [])
    setIsLoading(false)
  }, [selectedMonth, compareMode])

  useEffect(() => {
    queueMicrotask(() => {
      fetchMetrics()
    })
  }, [fetchMetrics])

  const { currentStart: rdCurrentStart, currentEnd: rdCurrentEnd } = getComparisonDates(
    selectedMonth,
    compareMode
  )
  const rdToday = new Date()
  const rdSafeEndDate = rdCurrentEnd > rdToday ? rdToday : rdCurrentEnd
  const rdStartDate = format(rdCurrentStart, 'yyyy-MM-dd')
  const rdEndDate = format(rdSafeEndDate, 'yyyy-MM-dd')

  const handleSubmit = async (data: Partial<ContentMetric>) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    
    if (!userData.user) return

    if (data.id) {
      await supabase
        .from('content_metrics')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', data.id)
    } else {
      await supabase.from('content_metrics').insert({
        ...data,
        user_id: userData.user.id,
      })
    }

    fetchMetrics()
    setEditingMetric(null)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('content_metrics').delete().eq('id', id)
    fetchMetrics()
  }

  // Filter metrics by channel
  const emailMetrics = metrics.filter(m => m.channel === 'email_marketing')
  const seoMetrics = metrics.filter(m => m.channel === 'seo')
  const instagramMetrics = metrics.filter(m => m.channel === 'instagram')
  const linkedinMetrics = metrics.filter(m => m.channel === 'linkedin')
  const compareEmailMetrics = compareMetrics.filter(m => m.channel === 'email_marketing')
  const compareSeoMetrics = compareMetrics.filter(m => m.channel === 'seo')
  const compareInstagramMetrics = compareMetrics.filter(m => m.channel === 'instagram')
  const compareLinkedinMetrics = compareMetrics.filter(m => m.channel === 'linkedin')

  // Calculate averages for email marketing
  const avgTaxaEntrega = emailMetrics.length > 0
    ? sum(emailMetrics.map(m => Number(m.taxa_entrega))) / emailMetrics.length
    : 0
  const avgTaxaAbertura = emailMetrics.length > 0
    ? sum(emailMetrics.map(m => Number(m.taxa_abertura))) / emailMetrics.length
    : 0
  const avgTaxaClique = emailMetrics.length > 0
    ? sum(emailMetrics.map(m => Number(m.taxa_clique))) / emailMetrics.length
    : 0

  // SEO totals
  const totalTrafegoOrganico = sum(seoMetrics.map(m => m.trafego_organico))
  const totalSessoes = sum(seoMetrics.map(m => m.sessoes))
  const totalPalavrasIndexadas = sum(seoMetrics.map(m => m.palavras_indexadas))

  // Social totals
  const totalInstagramLeads = sum(instagramMetrics.map(m => m.conversao_lead))
  const totalLinkedinLeads = sum(linkedinMetrics.map(m => m.conversao_lead))

  const compareAvgTaxaEntrega = compareEmailMetrics.length > 0
    ? sum(compareEmailMetrics.map(m => Number(m.taxa_entrega))) / compareEmailMetrics.length
    : 0
  const compareAvgTaxaAbertura = compareEmailMetrics.length > 0
    ? sum(compareEmailMetrics.map(m => Number(m.taxa_abertura))) / compareEmailMetrics.length
    : 0
  const compareAvgTaxaClique = compareEmailMetrics.length > 0
    ? sum(compareEmailMetrics.map(m => Number(m.taxa_clique))) / compareEmailMetrics.length
    : 0
  const compareAvgTaxaConversao = compareEmailMetrics.length > 0
    ? sum(compareEmailMetrics.map(m => Number(m.taxa_conversao))) / compareEmailMetrics.length
    : 0

  const compareTrafegoOrganico = sum(compareSeoMetrics.map(m => m.trafego_organico))
  const compareSessoes = sum(compareSeoMetrics.map(m => m.sessoes))
  const compareUsuarios = sum(compareSeoMetrics.map(m => m.usuarios))
  const comparePalavrasIndexadas = sum(compareSeoMetrics.map(m => m.palavras_indexadas))
  const compareDesempenhoSite = compareSeoMetrics.length > 0
    ? sum(compareSeoMetrics.map(m => Number(m.desempenho_site))) / compareSeoMetrics.length
    : 0

  const compareInstagramLeads = sum(compareInstagramMetrics.map(m => m.conversao_lead))
  const compareLinkedinLeads = sum(compareLinkedinMetrics.map(m => m.conversao_lead))

  const avgTaxaHardBounce = emailMetrics.length > 0
    ? sum(emailMetrics.map((metric) => Number(metric.taxa_hard_bounce))) / emailMetrics.length
    : 0
  const avgTaxaConversaoEmail = emailMetrics.length > 0
    ? sum(emailMetrics.map((metric) => Number(metric.taxa_conversao))) / emailMetrics.length
    : 0
  const compareAvgTaxaHardBounce = compareEmailMetrics.length > 0
    ? sum(compareEmailMetrics.map((metric) => Number(metric.taxa_hard_bounce))) / compareEmailMetrics.length
    : 0
  const totalSeoUsuarios = sum(seoMetrics.map((metric) => metric.usuarios))
  const avgDesempenhoSite = seoMetrics.length > 0
    ? sum(seoMetrics.map((metric) => Number(metric.desempenho_site))) / seoMetrics.length
    : 0
  const totalInstagramTrafego = sum(instagramMetrics.map((metric) => metric.trafego_organico))
  const totalLinkedinTrafego = sum(linkedinMetrics.map((metric) => metric.trafego_organico))
  const compareInstagramTrafego = sum(compareInstagramMetrics.map((metric) => metric.trafego_organico))
  const compareLinkedinTrafego = sum(compareLinkedinMetrics.map((metric) => metric.trafego_organico))
  const avgInstagramConversao = instagramMetrics.length > 0
    ? sum(instagramMetrics.map((metric) => Number(metric.taxa_conversao))) / instagramMetrics.length
    : 0
  const avgLinkedinConversao = linkedinMetrics.length > 0
    ? sum(linkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / linkedinMetrics.length
    : 0
  const compareAvgInstagramConversao = compareInstagramMetrics.length > 0
    ? sum(compareInstagramMetrics.map((metric) => Number(metric.taxa_conversao))) / compareInstagramMetrics.length
    : 0
  const compareAvgLinkedinConversao = compareLinkedinMetrics.length > 0
    ? sum(compareLinkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / compareLinkedinMetrics.length
    : 0

  const contentKpiMetrics: OrderedMetricOption[] = [
    {
      id: 'content-email-entrega',
      title: 'Taxa de Entrega',
      value: avgTaxaEntrega,
      previousValue: compareAvgTaxaEntrega,
      trend: calculateTrend(avgTaxaEntrega, compareAvgTaxaEntrega),
      format: 'percent',
      icon: <Mail className="h-4 w-4" />,
      category: 'E-mail Marketing',
    },
    {
      id: 'content-email-hard-bounce',
      title: 'Taxa Hard Bounce',
      value: avgTaxaHardBounce,
      previousValue: compareAvgTaxaHardBounce,
      trend: calculateTrend(avgTaxaHardBounce, compareAvgTaxaHardBounce),
      format: 'percent',
      category: 'E-mail Marketing',
    },
    {
      id: 'content-email-abertura',
      title: 'Taxa de Abertura',
      value: avgTaxaAbertura,
      previousValue: compareAvgTaxaAbertura,
      trend: calculateTrend(avgTaxaAbertura, compareAvgTaxaAbertura),
      format: 'percent',
      category: 'E-mail Marketing',
    },
    {
      id: 'content-email-clique',
      title: 'Taxa de Clique',
      value: avgTaxaClique,
      previousValue: compareAvgTaxaClique,
      trend: calculateTrend(avgTaxaClique, compareAvgTaxaClique),
      format: 'percent',
      category: 'E-mail Marketing',
    },
    {
      id: 'content-email-conversao',
      title: 'Taxa de Conversao',
      value: avgTaxaConversaoEmail,
      previousValue: compareAvgTaxaConversao,
      trend: calculateTrend(avgTaxaConversaoEmail, compareAvgTaxaConversao),
      format: 'percent',
      category: 'E-mail Marketing',
    },
    {
      id: 'content-seo-trafego',
      title: 'Trafego Organico',
      value: totalTrafegoOrganico,
      previousValue: compareTrafegoOrganico,
      trend: calculateTrend(totalTrafegoOrganico, compareTrafegoOrganico),
      format: 'number',
      icon: <Search className="h-4 w-4" />,
      category: 'SEO',
    },
    {
      id: 'content-seo-sessoes',
      title: 'Sessoes',
      value: totalSessoes,
      previousValue: compareSessoes,
      trend: calculateTrend(totalSessoes, compareSessoes),
      format: 'number',
      category: 'SEO',
    },
    {
      id: 'content-seo-usuarios',
      title: 'Usuarios',
      value: totalSeoUsuarios,
      previousValue: compareUsuarios,
      trend: calculateTrend(totalSeoUsuarios, compareUsuarios),
      format: 'number',
      category: 'SEO',
    },
    {
      id: 'content-seo-palavras',
      title: 'Palavras Indexadas',
      value: totalPalavrasIndexadas,
      previousValue: comparePalavrasIndexadas,
      trend: calculateTrend(totalPalavrasIndexadas, comparePalavrasIndexadas),
      format: 'number',
      category: 'SEO',
    },
    {
      id: 'content-seo-desempenho',
      title: 'Desempenho Site',
      value: avgDesempenhoSite,
      previousValue: compareDesempenhoSite,
      trend: calculateTrend(avgDesempenhoSite, compareDesempenhoSite),
      format: 'percent',
      category: 'SEO',
    },
    {
      id: 'content-instagram-trafego',
      title: 'Trafego/Sessoes',
      value: totalInstagramTrafego,
      previousValue: compareInstagramTrafego,
      trend: calculateTrend(totalInstagramTrafego, compareInstagramTrafego),
      format: 'number',
      icon: <Instagram className="h-4 w-4" />,
      category: 'Instagram',
    },
    {
      id: 'content-instagram-leads',
      title: 'Conversao de Lead',
      value: totalInstagramLeads,
      previousValue: compareInstagramLeads,
      trend: calculateTrend(totalInstagramLeads, compareInstagramLeads),
      format: 'number',
      category: 'Instagram',
    },
    {
      id: 'content-instagram-conversao',
      title: 'Taxa de Conversao',
      value: avgInstagramConversao,
      previousValue: compareAvgInstagramConversao,
      trend: calculateTrend(avgInstagramConversao, compareAvgInstagramConversao),
      format: 'percent',
      category: 'Instagram',
    },
    {
      id: 'content-linkedin-trafego',
      title: 'Trafego/Sessoes',
      value: totalLinkedinTrafego,
      previousValue: compareLinkedinTrafego,
      trend: calculateTrend(totalLinkedinTrafego, compareLinkedinTrafego),
      format: 'number',
      icon: <Linkedin className="h-4 w-4" />,
      category: 'LinkedIn',
    },
    {
      id: 'content-linkedin-leads',
      title: 'Conversao de Lead',
      value: totalLinkedinLeads,
      previousValue: compareLinkedinLeads,
      trend: calculateTrend(totalLinkedinLeads, compareLinkedinLeads),
      format: 'number',
      category: 'LinkedIn',
    },
    {
      id: 'content-linkedin-conversao',
      title: 'Taxa de Conversao',
      value: avgLinkedinConversao,
      previousValue: compareAvgLinkedinConversao,
      trend: calculateTrend(avgLinkedinConversao, compareAvgLinkedinConversao),
      format: 'percent',
      category: 'LinkedIn',
    },
  ]

  const getCurrentChannelMetrics = () => {
    switch (activeChannel) {
      case 'email_marketing': return emailMetrics
      case 'seo': return seoMetrics
      case 'instagram': return instagramMetrics
      case 'linkedin': return linkedinMetrics
      default: return []
    }
  }

  const getComparisonChartData = () => {
    switch (activeChannel) {
      case 'email_marketing':
        return [
          { label: 'Entrega %', atual: avgTaxaEntrega, comparativo: compareAvgTaxaEntrega },
          { label: 'Abertura %', atual: avgTaxaAbertura, comparativo: compareAvgTaxaAbertura },
          { label: 'Clique %', atual: avgTaxaClique, comparativo: compareAvgTaxaClique },
          {
            label: 'Conversao %',
            atual: emailMetrics.length > 0
              ? sum(emailMetrics.map((metric) => Number(metric.taxa_conversao))) / emailMetrics.length
              : 0,
            comparativo: compareAvgTaxaConversao,
          },
        ]
      case 'seo':
        return [
          { label: 'Trafego', atual: totalTrafegoOrganico, comparativo: compareTrafegoOrganico },
          { label: 'Sessoes', atual: totalSessoes, comparativo: compareSessoes },
          {
            label: 'Usuarios',
            atual: sum(seoMetrics.map((metric) => metric.usuarios)),
            comparativo: compareUsuarios,
          },
          { label: 'Palavras', atual: totalPalavrasIndexadas, comparativo: comparePalavrasIndexadas },
        ]
      case 'instagram':
        return [
          {
            label: 'Trafego/Sessoes',
            atual: sum(instagramMetrics.map((metric) => metric.trafego_organico)),
            comparativo: sum(compareInstagramMetrics.map((metric) => metric.trafego_organico)),
          },
          { label: 'Leads', atual: totalInstagramLeads, comparativo: compareInstagramLeads },
          {
            label: 'Conversao %',
            atual: instagramMetrics.length > 0
              ? sum(instagramMetrics.map((metric) => Number(metric.taxa_conversao))) / instagramMetrics.length
              : 0,
            comparativo: compareInstagramMetrics.length > 0
              ? sum(compareInstagramMetrics.map((metric) => Number(metric.taxa_conversao))) / compareInstagramMetrics.length
              : 0,
          },
        ]
      case 'linkedin':
        return [
          {
            label: 'Trafego/Sessoes',
            atual: sum(linkedinMetrics.map((metric) => metric.trafego_organico)),
            comparativo: sum(compareLinkedinMetrics.map((metric) => metric.trafego_organico)),
          },
          { label: 'Leads', atual: totalLinkedinLeads, comparativo: compareLinkedinLeads },
          {
            label: 'Conversao %',
            atual: linkedinMetrics.length > 0
              ? sum(linkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / linkedinMetrics.length
              : 0,
            comparativo: compareLinkedinMetrics.length > 0
              ? sum(compareLinkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / compareLinkedinMetrics.length
              : 0,
          },
        ]
      default:
        return []
    }
  }

  const renderChannelContent = () => {
    switch (activeChannel) {
      case 'email_marketing':
        return (
          <>
            <MetricOrderControl
              key="content-email"
              storageKey="avalyst-dashboard-kpis-content-email"
              metrics={contentKpiMetrics}
              defaultMetricIds={[
                'content-email-entrega',
                'content-email-hard-bounce',
                'content-email-abertura',
                'content-email-clique',
                'content-email-conversao',
              ]}
            />
            <RDStationEmailAnalytics
              key={`${rdStartDate}-${rdEndDate}`}
              startDate={rdStartDate}
              endDate={rdEndDate}
            />
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base font-medium">Comparativo Email Marketing</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonChart
                  title="Indicadores de E-mail"
                  data={getComparisonChartData()}
                  formatter="percent"
                />
              </CardContent>
            </Card>
          </>
        )
      case 'seo':
        return (
          <>
            <MetricOrderControl
              key="content-seo"
              storageKey="avalyst-dashboard-kpis-content-seo"
              metrics={contentKpiMetrics}
              defaultMetricIds={[
                'content-seo-trafego',
                'content-seo-sessoes',
                'content-seo-usuarios',
                'content-seo-palavras',
                'content-seo-desempenho',
              ]}
            />
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base font-medium">Comparativo SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonChart
                  title="Indicadores de SEO"
                  data={getComparisonChartData()}
                />
              </CardContent>
            </Card>
          </>
        )
      case 'instagram':
        return (
          <>
            <MetricOrderControl
              key="content-instagram"
              storageKey="avalyst-dashboard-kpis-content-instagram"
              metrics={contentKpiMetrics}
              defaultMetricIds={[
                'content-instagram-trafego',
                'content-instagram-leads',
                'content-instagram-conversao',
              ]}
            />
            <div className="mb-8">
              <ComparisonChart title="Comparativo Instagram" data={getComparisonChartData()} />
            </div>
          </>
        )
      case 'linkedin':
        return (
          <>
            <MetricOrderControl
              key="content-linkedin"
              storageKey="avalyst-dashboard-kpis-content-linkedin"
              metrics={contentKpiMetrics}
              defaultMetricIds={[
                'content-linkedin-trafego',
                'content-linkedin-leads',
                'content-linkedin-conversao',
              ]}
            />
            <div className="mb-8">
              <ComparisonChart title="Comparativo LinkedIn" data={getComparisonChartData()} />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="KPIs de Conteudo"
        subtitle="Metricas de E-mail Marketing, SEO e Redes Sociais"
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <DateFilter
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />
          <Button onClick={() => { setEditingMetric(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Dados
          </Button>
        </div>

        <Tabs value={activeChannel} onValueChange={setActiveChannel} className="mb-8">
          <TabsList>
            <TabsTrigger value="email_marketing">E-mail Marketing</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          </TabsList>

          <TabsContent value={activeChannel} className="mt-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando dados...
              </div>
            ) : (
              <>
                {renderChannelContent()}

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">Dados do Periodo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          {activeChannel === 'email_marketing' && (
                            <>
                              <TableHead className="text-right">Entrega %</TableHead>
                              <TableHead className="text-right">Abertura %</TableHead>
                              <TableHead className="text-right">Clique %</TableHead>
                              <TableHead className="text-right">Conversao %</TableHead>
                            </>
                          )}
                          {activeChannel === 'seo' && (
                            <>
                              <TableHead className="text-right">Trafego</TableHead>
                              <TableHead className="text-right">Sessoes</TableHead>
                              <TableHead className="text-right">Usuarios</TableHead>
                              <TableHead className="text-right">Palavras</TableHead>
                            </>
                          )}
                          {(activeChannel === 'instagram' || activeChannel === 'linkedin') && (
                            <>
                              <TableHead className="text-right">Trafego</TableHead>
                              <TableHead className="text-right">Leads</TableHead>
                              <TableHead className="text-right">Conversao %</TableHead>
                            </>
                          )}
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getCurrentChannelMetrics().map((metric) => (
                          <TableRow key={metric.id}>
                            <TableCell>{metric.reference_date}</TableCell>
                            {activeChannel === 'email_marketing' && (
                              <>
                                <TableCell className="text-right">{Number(metric.taxa_entrega).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{Number(metric.taxa_abertura).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{Number(metric.taxa_clique).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{Number(metric.taxa_conversao).toFixed(2)}%</TableCell>
                              </>
                            )}
                            {activeChannel === 'seo' && (
                              <>
                                <TableCell className="text-right">{metric.trafego_organico}</TableCell>
                                <TableCell className="text-right">{metric.sessoes}</TableCell>
                                <TableCell className="text-right">{metric.usuarios}</TableCell>
                                <TableCell className="text-right">{metric.palavras_indexadas}</TableCell>
                              </>
                            )}
                            {(activeChannel === 'instagram' || activeChannel === 'linkedin') && (
                              <>
                                <TableCell className="text-right">{metric.trafego_organico}</TableCell>
                                <TableCell className="text-right">{metric.conversao_lead}</TableCell>
                                <TableCell className="text-right">{Number(metric.taxa_conversao).toFixed(2)}%</TableCell>
                              </>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setEditingMetric(metric); setDialogOpen(true) }}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(metric.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {getCurrentChannelMetrics().length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhum dado encontrado para este periodo.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ContentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        metric={editingMetric}
        onSubmit={handleSubmit}
        defaultChannel={activeChannel}
      />
    </div>
  )
}
