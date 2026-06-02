'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfMonth } from 'date-fns'
import { Plus, Mail, Search, Instagram, Linkedin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { DateFilter, CompareMode, getComparisonDates } from '@/components/dashboard/date-filter'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ContentFormDialog } from '@/components/dashboard/content-form-dialog'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
              <KPICard
                title="Taxa de Entrega"
                value={avgTaxaEntrega}
                format="percent"
                icon={<Mail className="h-4 w-4" />}
              />
              <KPICard
                title="Taxa Hard Bounce"
                value={emailMetrics.length > 0 
                  ? sum(emailMetrics.map((metric) => Number(metric.taxa_hard_bounce))) / emailMetrics.length 
                  : 0}
                previousValue={compareEmailMetrics.length > 0
                  ? sum(compareEmailMetrics.map((metric) => Number(metric.taxa_hard_bounce))) / compareEmailMetrics.length
                  : 0}
                trend={calculateTrend(
                  emailMetrics.length > 0 ? sum(emailMetrics.map((metric) => Number(metric.taxa_hard_bounce))) / emailMetrics.length : 0,
                  compareEmailMetrics.length > 0 ? sum(compareEmailMetrics.map((metric) => Number(metric.taxa_hard_bounce))) / compareEmailMetrics.length : 0
                )}
                format="percent"
              />
              <KPICard
                title="Taxa de Abertura"
                value={avgTaxaAbertura}
                previousValue={compareAvgTaxaAbertura}
                trend={calculateTrend(avgTaxaAbertura, compareAvgTaxaAbertura)}
                format="percent"
              />
              <KPICard
                title="Taxa de Clique"
                value={avgTaxaClique}
                previousValue={compareAvgTaxaClique}
                trend={calculateTrend(avgTaxaClique, compareAvgTaxaClique)}
                format="percent"
              />
              <KPICard
                title="Taxa de Conversao"
                value={emailMetrics.length > 0 
                  ? sum(emailMetrics.map((metric) => Number(metric.taxa_conversao))) / emailMetrics.length 
                  : 0}
                previousValue={compareAvgTaxaConversao}
                trend={calculateTrend(
                  emailMetrics.length > 0 ? sum(emailMetrics.map((metric) => Number(metric.taxa_conversao))) / emailMetrics.length : 0,
                  compareAvgTaxaConversao
                )}
                format="percent"
              />
            </div>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
              <KPICard
                title="Trafego Organico"
                value={totalTrafegoOrganico}
                format="number"
                icon={<Search className="h-4 w-4" />}
              />
              <KPICard
                title="Sessoes"
                value={totalSessoes}
                previousValue={compareSessoes}
                trend={calculateTrend(totalSessoes, compareSessoes)}
                format="number"
              />
              <KPICard
                title="Usuarios"
                value={seoMetrics.reduce((acc, m) => acc + m.usuarios, 0)}
                previousValue={compareUsuarios}
                trend={calculateTrend(sum(seoMetrics.map((metric) => metric.usuarios)), compareUsuarios)}
                format="number"
              />
              <KPICard
                title="Palavras Indexadas"
                value={totalPalavrasIndexadas}
                previousValue={comparePalavrasIndexadas}
                trend={calculateTrend(totalPalavrasIndexadas, comparePalavrasIndexadas)}
                format="number"
              />
              <KPICard
                title="Desempenho Site"
                value={seoMetrics.length > 0 
                  ? sum(seoMetrics.map((metric) => Number(metric.desempenho_site))) / seoMetrics.length 
                  : 0}
                previousValue={compareDesempenhoSite}
                trend={calculateTrend(
                  seoMetrics.length > 0 ? sum(seoMetrics.map((metric) => Number(metric.desempenho_site))) / seoMetrics.length : 0,
                  compareDesempenhoSite
                )}
                format="percent"
              />
            </div>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <KPICard
              title="Trafego/Sessoes"
              value={instagramMetrics.reduce((acc, m) => acc + m.trafego_organico, 0)}
              format="number"
              icon={<Instagram className="h-4 w-4" />}
            />
            <KPICard
              title="Conversao de Lead"
              value={totalInstagramLeads}
              previousValue={compareInstagramLeads}
              trend={calculateTrend(totalInstagramLeads, compareInstagramLeads)}
              format="number"
            />
            <KPICard
              title="Taxa de Conversao"
              value={instagramMetrics.length > 0 
                ? sum(instagramMetrics.map((metric) => Number(metric.taxa_conversao))) / instagramMetrics.length 
                : 0}
              previousValue={compareInstagramMetrics.length > 0
                ? sum(compareInstagramMetrics.map((metric) => Number(metric.taxa_conversao))) / compareInstagramMetrics.length
                : 0}
              trend={calculateTrend(
                instagramMetrics.length > 0 ? sum(instagramMetrics.map((metric) => Number(metric.taxa_conversao))) / instagramMetrics.length : 0,
                compareInstagramMetrics.length > 0 ? sum(compareInstagramMetrics.map((metric) => Number(metric.taxa_conversao))) / compareInstagramMetrics.length : 0
              )}
              format="percent"
            />
            <div className="lg:col-span-3">
              <ComparisonChart title="Comparativo Instagram" data={getComparisonChartData()} />
            </div>
          </div>
        )
      case 'linkedin':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <KPICard
              title="Trafego/Sessoes"
              value={linkedinMetrics.reduce((acc, m) => acc + m.trafego_organico, 0)}
              format="number"
              icon={<Linkedin className="h-4 w-4" />}
            />
            <KPICard
              title="Conversao de Lead"
              value={totalLinkedinLeads}
              previousValue={compareLinkedinLeads}
              trend={calculateTrend(totalLinkedinLeads, compareLinkedinLeads)}
              format="number"
            />
            <KPICard
              title="Taxa de Conversao"
              value={linkedinMetrics.length > 0 
                ? sum(linkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / linkedinMetrics.length 
                : 0}
              previousValue={compareLinkedinMetrics.length > 0
                ? sum(compareLinkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / compareLinkedinMetrics.length
                : 0}
              trend={calculateTrend(
                linkedinMetrics.length > 0 ? sum(linkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / linkedinMetrics.length : 0,
                compareLinkedinMetrics.length > 0 ? sum(compareLinkedinMetrics.map((metric) => Number(metric.taxa_conversao))) / compareLinkedinMetrics.length : 0
              )}
              format="percent"
            />
            <div className="lg:col-span-3">
              <ComparisonChart title="Comparativo LinkedIn" data={getComparisonChartData()} />
            </div>
          </div>
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
