'use client'

import { useCallback, useEffect, useState } from 'react'
import { startOfMonth } from 'date-fns'
import { Plus, UserPlus, Trophy, XCircle, CalendarRange } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { DateFilter, CompareMode, getComparisonDates } from '@/components/dashboard/date-filter'
import { KPICard } from '@/components/dashboard/kpi-card'
import { CRMFormDialog } from '@/components/dashboard/crm-form-dialog'
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
import { CRMMetric } from '@/lib/types'
import { calculateTrend, sum } from '@/lib/dashboard-metrics'
import { Pencil, Trash2 } from 'lucide-react'

export default function CRMPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [compareMode, setCompareMode] = useState<CompareMode>('month')
  const [metrics, setMetrics] = useState<CRMMetric[]>([])
  const [compareMetrics, setCompareMetrics] = useState<CRMMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<CRMMetric | null>(null)

  const fetchMetrics = useCallback(async () => {
    const supabase = createClient()
    const { currentStart, currentEnd, compareStart, compareEnd } = getComparisonDates(
      selectedMonth,
      compareMode
    )

    setIsLoading(true)
    setErrorMessage(null)

    const { data: currentData, error: currentError } = await supabase
      .from('crm_metrics')
      .select('*')
      .gte('reference_date', currentStart.toISOString().split('T')[0])
      .lte('reference_date', currentEnd.toISOString().split('T')[0])

    const { data: previousData, error: previousError } = await supabase
      .from('crm_metrics')
      .select('*')
      .gte('reference_date', compareStart.toISOString().split('T')[0])
      .lte('reference_date', compareEnd.toISOString().split('T')[0])

    if (currentError || previousError) {
      setErrorMessage(currentError?.message || previousError?.message || 'Erro ao carregar dados de CRM.')
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

  const handleSubmit = async (data: Partial<CRMMetric>) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    if (data.id) {
      const { error } = await supabase
        .from('crm_metrics')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', data.id)
      if (error) {
        setErrorMessage(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('crm_metrics').insert({
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
    const { error } = await supabase.from('crm_metrics').delete().eq('id', id)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage(null)
    fetchMetrics()
  }

  const totalNovosLeads = sum(metrics.map((metric) => metric.novos_leads))
  const totalWon = sum(metrics.map((metric) => metric.status_won))
  const totalLost = sum(metrics.map((metric) => metric.status_lost))
  const totalReunioes = sum(metrics.map((metric) => metric.fase_reuniao_agendada))

  const prevLeads = sum(compareMetrics.map((metric) => metric.novos_leads))
  const prevWon = sum(compareMetrics.map((metric) => metric.status_won))
  const prevLost = sum(compareMetrics.map((metric) => metric.status_lost))
  const prevReunioes = sum(compareMetrics.map((metric) => metric.fase_reuniao_agendada))

  const conversionRate = totalNovosLeads > 0 ? (totalWon / totalNovosLeads) * 100 : 0
  const prevConversionRate = prevLeads > 0 ? (prevWon / prevLeads) * 100 : 0

  const pipelineChartData = [
    {
      label: 'Novos Leads',
      atual: sum(metrics.map((metric) => metric.fase_novos_leads)),
      comparativo: sum(compareMetrics.map((metric) => metric.fase_novos_leads)),
    },
    {
      label: 'Discovery',
      atual: sum(metrics.map((metric) => metric.fase_discovery)),
      comparativo: sum(compareMetrics.map((metric) => metric.fase_discovery)),
    },
    {
      label: 'Qualificacao',
      atual: sum(metrics.map((metric) => metric.fase_qualificacao)),
      comparativo: sum(compareMetrics.map((metric) => metric.fase_qualificacao)),
    },
    {
      label: 'Cadencia',
      atual: sum(metrics.map((metric) => metric.fase_cadencia)),
      comparativo: sum(compareMetrics.map((metric) => metric.fase_cadencia)),
    },
    {
      label: 'Conexao',
      atual: sum(metrics.map((metric) => metric.fase_conexao)),
      comparativo: sum(compareMetrics.map((metric) => metric.fase_conexao)),
    },
    {
      label: 'Reuniao',
      atual: totalReunioes,
      comparativo: prevReunioes,
    },
  ]

  const statusChartData = [
    { label: 'WON', atual: totalWon, comparativo: prevWon },
    { label: 'LOST', atual: totalLost, comparativo: prevLost },
  ]

  return (
    <div className="min-h-screen">
      <DashboardHeader title="KPIs de CRM" subtitle="Leads, status WON/LOST e fases do funil comercial" />

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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard
            title="Novos Leads"
            value={totalNovosLeads}
            previousValue={prevLeads}
            trend={calculateTrend(totalNovosLeads, prevLeads)}
            format="number"
            icon={<UserPlus className="h-4 w-4" />}
          />
          <KPICard
            title="WON"
            value={totalWon}
            previousValue={prevWon}
            trend={calculateTrend(totalWon, prevWon)}
            format="number"
            icon={<Trophy className="h-4 w-4" />}
          />
          <KPICard
            title="LOST"
            value={totalLost}
            previousValue={prevLost}
            trend={calculateTrend(totalLost, prevLost)}
            format="number"
            icon={<XCircle className="h-4 w-4" />}
          />
          <KPICard
            title="Taxa de Conversao"
            value={conversionRate}
            previousValue={prevConversionRate}
            trend={calculateTrend(conversionRate, prevConversionRate)}
            format="percent"
            icon={<CalendarRange className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <ComparisonChart title="Fases do funil CRM" data={pipelineChartData} />
          <ComparisonChart title="Status WON vs LOST" data={statusChartData} />
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
                  <TableHead className="text-right">Novos Leads</TableHead>
                  <TableHead className="text-right">WON</TableHead>
                  <TableHead className="text-right">LOST</TableHead>
                  <TableHead className="text-right">Discovery</TableHead>
                  <TableHead className="text-right">Qualificacao</TableHead>
                  <TableHead className="text-right">Reunioes</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Carregando dados...
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {metrics.map((metric) => (
                      <TableRow key={metric.id}>
                        <TableCell>{metric.reference_date}</TableCell>
                        <TableCell className="text-right">{metric.novos_leads}</TableCell>
                        <TableCell className="text-right">{metric.status_won}</TableCell>
                        <TableCell className="text-right">{metric.status_lost}</TableCell>
                        <TableCell className="text-right">{metric.fase_discovery}</TableCell>
                        <TableCell className="text-right">{metric.fase_qualificacao}</TableCell>
                        <TableCell className="text-right">{metric.fase_reuniao_agendada}</TableCell>
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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

      <CRMFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        metric={editingMetric}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
