'use client'

import { useCallback, useEffect, useState } from 'react'
import { startOfMonth } from 'date-fns'
import { Plus, MousePointerClick, Percent, Eye, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { DateFilter, CompareMode, getComparisonDates } from '@/components/dashboard/date-filter'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ADSFormDialog } from '@/components/dashboard/ads-form-dialog'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ADSMetric, ADS_PLATFORMS } from '@/lib/types'
import { calculateTrend, sum } from '@/lib/dashboard-metrics'
import { Pencil, Trash2 } from 'lucide-react'

function getPlatformLabel(platformValue: string) {
  return ADS_PLATFORMS.find((platform) => platform.value === platformValue)?.label || platformValue
}

export default function ADSPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [compareMode, setCompareMode] = useState<CompareMode>('month')
  const [metrics, setMetrics] = useState<ADSMetric[]>([])
  const [compareMetrics, setCompareMetrics] = useState<ADSMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<ADSMetric | null>(null)

  const fetchMetrics = useCallback(async () => {
    const supabase = createClient()
    const { currentStart, currentEnd, compareStart, compareEnd } = getComparisonDates(
      selectedMonth,
      compareMode
    )

    setIsLoading(true)
    setErrorMessage(null)

    const { data: currentData, error: currentError } = await supabase
      .from('ads_metrics')
      .select('*')
      .gte('reference_date', currentStart.toISOString().split('T')[0])
      .lte('reference_date', currentEnd.toISOString().split('T')[0])

    const { data: previousData, error: previousError } = await supabase
      .from('ads_metrics')
      .select('*')
      .gte('reference_date', compareStart.toISOString().split('T')[0])
      .lte('reference_date', compareEnd.toISOString().split('T')[0])

    if (currentError || previousError) {
      setErrorMessage(currentError?.message || previousError?.message || 'Erro ao carregar dados de ADS.')
    }

    setMetrics(currentData || [])
    setCompareMetrics(previousData || [])
    setIsLoading(false)
  }, [selectedMonth, compareMode])

  useEffect(() => {
    queueMicrotask(() => {
      fetchMetrics()
    })
  }, [fetchMetrics])

  const handleSubmit = async (data: Partial<ADSMetric>) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    if (data.id) {
      const { error } = await supabase
        .from('ads_metrics')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', data.id)
      if (error) {
        setErrorMessage(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('ads_metrics').insert({
        ...data,
        user_id: userData.user.id,
      })
      if (error) {
        setErrorMessage(error.message)
        return
      }
    }

    setErrorMessage(null)
    fetchMetrics()
    setEditingMetric(null)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('ads_metrics').delete().eq('id', id)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage(null)
    fetchMetrics()
  }

  const avgTaxaConversao =
    metrics.length > 0 ? sum(metrics.map((metric) => Number(metric.taxa_conversao))) / metrics.length : 0
  const avgTaxaClique =
    metrics.length > 0 ? sum(metrics.map((metric) => Number(metric.taxa_clique))) / metrics.length : 0
  const totalImpressoes = sum(metrics.map((metric) => metric.impressoes))
  const avgCustoClique =
    metrics.length > 0 ? sum(metrics.map((metric) => Number(metric.custo_clique))) / metrics.length : 0
  const avgCustoAquisicao =
    metrics.length > 0 ? sum(metrics.map((metric) => Number(metric.custo_aquisicao))) / metrics.length : 0

  const prevTaxaConversao =
    compareMetrics.length > 0
      ? sum(compareMetrics.map((metric) => Number(metric.taxa_conversao))) / compareMetrics.length
      : 0
  const prevTaxaClique =
    compareMetrics.length > 0
      ? sum(compareMetrics.map((metric) => Number(metric.taxa_clique))) / compareMetrics.length
      : 0
  const prevImpressoes = sum(compareMetrics.map((metric) => metric.impressoes))
  const prevCustoClique =
    compareMetrics.length > 0
      ? sum(compareMetrics.map((metric) => Number(metric.custo_clique))) / compareMetrics.length
      : 0
  const prevCustoAquisicao =
    compareMetrics.length > 0
      ? sum(compareMetrics.map((metric) => Number(metric.custo_aquisicao))) / compareMetrics.length
      : 0

  const performanceChartData = [
    { label: 'Conversao %', atual: avgTaxaConversao, comparativo: prevTaxaConversao },
    { label: 'Clique %', atual: avgTaxaClique, comparativo: prevTaxaClique },
    { label: 'Impressoes', atual: totalImpressoes, comparativo: prevImpressoes },
  ]

  const costChartData = [
    { label: 'Custo por Clique', atual: avgCustoClique, comparativo: prevCustoClique },
    { label: 'Custo por Aquisicao', atual: avgCustoAquisicao, comparativo: prevCustoAquisicao },
  ]

  const platformChartData = ADS_PLATFORMS.map((platform) => {
    const currentPlatformMetrics = metrics.filter((metric) => metric.platform === platform.value)
    const comparePlatformMetrics = compareMetrics.filter((metric) => metric.platform === platform.value)

    return {
      label: platform.label,
      atual: sum(currentPlatformMetrics.map((metric) => Number(metric.investimento))),
      comparativo: sum(comparePlatformMetrics.map((metric) => Number(metric.investimento))),
    }
  })

  return (
    <div className="min-h-screen">
      <DashboardHeader title="KPIs de ADS" subtitle="Performance e custos das campanhas pagas" />

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
        {errorMessage && (
          <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <KPICard
            title="Taxa de Conversao"
            value={avgTaxaConversao}
            previousValue={prevTaxaConversao}
            trend={calculateTrend(avgTaxaConversao, prevTaxaConversao)}
            format="percent"
            icon={<Percent className="h-4 w-4" />}
          />
          <KPICard
            title="Taxa de Clique"
            value={avgTaxaClique}
            previousValue={prevTaxaClique}
            trend={calculateTrend(avgTaxaClique, prevTaxaClique)}
            format="percent"
            icon={<MousePointerClick className="h-4 w-4" />}
          />
          <KPICard
            title="Impressoes"
            value={totalImpressoes}
            previousValue={prevImpressoes}
            trend={calculateTrend(totalImpressoes, prevImpressoes)}
            format="number"
            icon={<Eye className="h-4 w-4" />}
          />
          <KPICard
            title="Custo por Clique"
            value={avgCustoClique}
            previousValue={prevCustoClique}
            trend={calculateTrend(avgCustoClique, prevCustoClique)}
            format="currency"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPICard
            title="Custo por Aquisicao"
            value={avgCustoAquisicao}
            previousValue={prevCustoAquisicao}
            trend={calculateTrend(avgCustoAquisicao, prevCustoAquisicao)}
            format="currency"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <ComparisonChart title="Performance de ADS" data={performanceChartData} />
          <ComparisonChart title="Comparativo de custos" data={costChartData} formatter="currency" />
        </div>

        <div className="mb-8">
          <ComparisonChart title="Investimento por plataforma" data={platformChartData} formatter="currency" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Dados do periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-right">Conversao %</TableHead>
                  <TableHead className="text-right">Clique %</TableHead>
                  <TableHead className="text-right">Impressoes</TableHead>
                  <TableHead className="text-right">CPC</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Carregando dados...
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {metrics.map((metric) => (
                      <TableRow key={metric.id}>
                        <TableCell>{metric.reference_date}</TableCell>
                        <TableCell>{getPlatformLabel(metric.platform)}</TableCell>
                        <TableCell className="text-right">{Number(metric.taxa_conversao).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{Number(metric.taxa_clique).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{metric.impressoes}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(metric.custo_clique))}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(metric.custo_aquisicao))}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(metric.investimento))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingMetric(metric); setDialogOpen(true) }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(metric.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {metrics.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhum dado encontrado para o periodo.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ADSFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        metric={editingMetric}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
