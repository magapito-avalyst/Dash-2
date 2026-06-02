'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfMonth } from 'date-fns'
import { Plus, DollarSign, Users, Calendar, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { DateFilter, CompareMode, getComparisonDates } from '@/components/dashboard/date-filter'
import { KPICard } from '@/components/dashboard/kpi-card'
import { MarketingTable } from '@/components/dashboard/marketing-table'
import { MetricFormDialog } from '@/components/dashboard/metric-form-dialog'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MARKETING_SOURCES, MarketingMetric } from '@/lib/types'
import Link from 'next/link'
import { calculateTrend, sum } from '@/lib/dashboard-metrics'

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [compareMode, setCompareMode] = useState<CompareMode>('month')
  const [metrics, setMetrics] = useState<MarketingMetric[]>([])
  const [compareMetrics, setCompareMetrics] = useState<MarketingMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<MarketingMetric | null>(null)

  const fetchMetrics = useCallback(async () => {
    const supabase = createClient()
    const { currentStart, currentEnd, compareStart, compareEnd } = getComparisonDates(
      selectedMonth,
      compareMode
    )

    setIsLoading(true)

    // Fetch current period metrics
    const { data: currentData } = await supabase
      .from('marketing_metrics')
      .select('*')
      .gte('reference_date', currentStart.toISOString().split('T')[0])
      .lte('reference_date', currentEnd.toISOString().split('T')[0])

    // Fetch comparison period metrics
    const { data: compareData } = await supabase
      .from('marketing_metrics')
      .select('*')
      .gte('reference_date', compareStart.toISOString().split('T')[0])
      .lte('reference_date', compareEnd.toISOString().split('T')[0])

    setMetrics(currentData || [])
    setCompareMetrics(compareData || [])
    setIsLoading(false)
  }, [selectedMonth, compareMode])

  useEffect(() => {
    queueMicrotask(() => {
      fetchMetrics()
    })
  }, [fetchMetrics])

  const handleSubmit = async (data: Partial<MarketingMetric>) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    
    if (!userData.user) return

    if (data.id) {
      // Update existing metric
      await supabase
        .from('marketing_metrics')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
    } else {
      // Create new metric
      await supabase.from('marketing_metrics').insert({
        ...data,
        user_id: userData.user.id,
      })
    }

    fetchMetrics()
    setEditingMetric(null)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('marketing_metrics').delete().eq('id', id)
    fetchMetrics()
  }

  const handleEdit = (metric: MarketingMetric) => {
    setEditingMetric(metric)
    setDialogOpen(true)
  }

  const totalInvestimento = sum(metrics.map((metric) => Number(metric.investimento)))
  const totalMqls = sum(metrics.map((metric) => metric.mqls))
  const totalDemoAgendadas = sum(metrics.map((metric) => metric.demo_agendadas))
  const totalDemoRealizadas = sum(metrics.map((metric) => metric.demo_realizadas))
  const totalOnboarding = sum(metrics.map((metric) => metric.onboarding))
  const avgCicloVenda = metrics.length > 0 
    ? sum(metrics.map((metric) => metric.ciclo_venda)) / metrics.length 
    : 0

  const prevInvestimento = sum(compareMetrics.map((metric) => Number(metric.investimento)))
  const prevMqls = sum(compareMetrics.map((metric) => metric.mqls))
  const prevDemoAgendadas = sum(compareMetrics.map((metric) => metric.demo_agendadas))
  const prevDemoRealizadas = sum(compareMetrics.map((metric) => metric.demo_realizadas))
  const prevOnboarding = sum(compareMetrics.map((metric) => metric.onboarding))

  const investimentoTrend = calculateTrend(totalInvestimento, prevInvestimento)
  const mqlsTrend = calculateTrend(totalMqls, prevMqls)
  const onboardingTrend = calculateTrend(totalOnboarding, prevOnboarding)

  const funnelChartData = [
    { label: 'MQLs', atual: totalMqls, comparativo: prevMqls },
    { label: 'DEMO Agendadas', atual: totalDemoAgendadas, comparativo: prevDemoAgendadas },
    { label: 'DEMO Realizadas', atual: totalDemoRealizadas, comparativo: prevDemoRealizadas },
    { label: 'Onboarding', atual: totalOnboarding, comparativo: prevOnboarding },
  ]

  const sourceChartData = MARKETING_SOURCES.map((source) => {
    const currentSourceMetrics = metrics.filter((metric) => metric.source === source)
    const compareSourceMetrics = compareMetrics.filter((metric) => metric.source === source)

    return {
      label: source,
      atual: sum(currentSourceMetrics.map((metric) => metric.mqls)),
      comparativo: sum(compareSourceMetrics.map((metric) => metric.mqls)),
    }
  })

  const currentCpl = totalMqls > 0 ? totalInvestimento / totalMqls : 0
  const currentCpo = totalDemoRealizadas > 0 ? totalInvestimento / totalDemoRealizadas : 0
  const currentCpa = totalOnboarding > 0 ? totalInvestimento / totalOnboarding : 0

  const previousCpl = prevMqls > 0 ? prevInvestimento / prevMqls : 0
  const previousCpo = prevDemoRealizadas > 0 ? prevInvestimento / prevDemoRealizadas : 0
  const previousCpa = prevOnboarding > 0 ? prevInvestimento / prevOnboarding : 0

  const costChartData = [
    { label: 'CPL', atual: currentCpl, comparativo: previousCpl },
    { label: 'CPO', atual: currentCpo, comparativo: previousCpo },
    { label: 'CPA', atual: currentCpa, comparativo: previousCpa },
  ]

  const conversionChartData = [
    {
      label: 'MQL > DEMO Agendada',
      atual: totalMqls > 0 ? (totalDemoAgendadas / totalMqls) * 100 : 0,
      comparativo: prevMqls > 0 ? (prevDemoAgendadas / prevMqls) * 100 : 0,
    },
    {
      label: 'DEMO Agendada > Realizada',
      atual: totalDemoAgendadas > 0 ? (totalDemoRealizadas / totalDemoAgendadas) * 100 : 0,
      comparativo: prevDemoAgendadas > 0 ? (prevDemoRealizadas / prevDemoAgendadas) * 100 : 0,
    },
    {
      label: 'DEMO Realizada > Onboarding',
      atual: totalDemoRealizadas > 0 ? (totalOnboarding / totalDemoRealizadas) * 100 : 0,
      comparativo: prevDemoRealizadas > 0 ? (prevOnboarding / prevDemoRealizadas) * 100 : 0,
    },
  ]

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Visao Geral"
        subtitle="Metricas gerais de marketing da Avalyst"
      />

      <div className="p-8">
        {/* Filters and Actions */}
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

        {/* Quick Navigation Tabs */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList>
            <TabsTrigger value="overview">Visao Geral</TabsTrigger>
            <TabsTrigger value="content" asChild>
              <Link href="/dashboard/conteudo">Conteudo</Link>
            </TabsTrigger>
            <TabsTrigger value="crm" asChild>
              <Link href="/dashboard/crm">CRM</Link>
            </TabsTrigger>
            <TabsTrigger value="ads" asChild>
              <Link href="/dashboard/ads">ADS</Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <KPICard
                title="Investimento Total"
                value={totalInvestimento}
                previousValue={prevInvestimento}
                format="currency"
                trend={investimentoTrend}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <KPICard
                title="MQLs"
                value={totalMqls}
                previousValue={prevMqls}
                format="number"
                trend={mqlsTrend}
                icon={<Users className="h-4 w-4" />}
              />
              <KPICard
                title="Onboarding"
                value={totalOnboarding}
                previousValue={prevOnboarding}
                format="number"
                trend={onboardingTrend}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <KPICard
                title="Ciclo de Venda (dias)"
                value={Math.round(avgCicloVenda)}
                format="number"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <ComparisonChart title="Funil de Conversao" data={funnelChartData} />
              <ComparisonChart title="MQLs por Fonte" data={sourceChartData} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <ComparisonChart title="Comparativo de Custo" data={costChartData} formatter="currency" />
              <ComparisonChart title="Taxas de Conversao do Funil" data={conversionChartData} formatter="percent" />
            </div>

            {/* Marketing Table */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Detalhamento por Fonte</h2>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando dados...
                </div>
              ) : (
                <MarketingTable
                  data={metrics}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MetricFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        metric={editingMetric}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
