'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { startOfMonth } from 'date-fns'
import { Plus, FolderKanban, ChartNoAxesCombined, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { DateFilter, CompareMode, getComparisonDates } from '@/components/dashboard/date-filter'
import { ProjectFormDialog } from '@/components/dashboard/project-form-dialog'
import { ProjectMetricFormDialog } from '@/components/dashboard/project-metric-form-dialog'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'
import {
  MetricOrderControl,
  type OrderedMetricOption,
} from '@/components/dashboard/metric-order-control'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Project, ProjectMetric } from '@/lib/types'
import { calculateTrend, sum } from '@/lib/dashboard-metrics'
import { Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function ProjetosPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [compareMode, setCompareMode] = useState<CompareMode>('month')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetric[]>([])
  const [compareMetrics, setCompareMetrics] = useState<ProjectMetric[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [projectMetricDialogOpen, setProjectMetricDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingMetric, setEditingMetric] = useState<ProjectMetric | null>(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  )

  const fetchProjectsAndMetrics = useCallback(async () => {
    const supabase = createClient()
    const { currentStart, currentEnd, compareStart, compareEnd } = getComparisonDates(
      selectedMonth,
      compareMode
    )

    setIsLoading(true)
    setErrorMessage(null)

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectsError) {
      setErrorMessage(projectsError.message)
      setProjects([])
      setProjectMetrics([])
      setCompareMetrics([])
      setIsLoading(false)
      return
    }

    const availableProjects = projectsData || []
    setProjects(availableProjects)

    const activeProjectId = selectedProjectId || availableProjects[0]?.id
    setSelectedProjectId(activeProjectId || null)

    if (!activeProjectId) {
      setProjectMetrics([])
      setCompareMetrics([])
      setIsLoading(false)
      return
    }

    const { data: currentMetrics, error: currentMetricsError } = await supabase
      .from('project_metrics')
      .select('*')
      .eq('project_id', activeProjectId)
      .gte('reference_date', currentStart.toISOString().split('T')[0])
      .lte('reference_date', currentEnd.toISOString().split('T')[0])

    const { data: previousMetrics, error: previousMetricsError } = await supabase
      .from('project_metrics')
      .select('*')
      .eq('project_id', activeProjectId)
      .gte('reference_date', compareStart.toISOString().split('T')[0])
      .lte('reference_date', compareEnd.toISOString().split('T')[0])

    if (currentMetricsError || previousMetricsError) {
      setErrorMessage(
        currentMetricsError?.message || previousMetricsError?.message || 'Erro ao carregar metricas de projetos.'
      )
    }

    setProjectMetrics(currentMetrics || [])
    setCompareMetrics(previousMetrics || [])
    setIsLoading(false)
  }, [selectedMonth, compareMode, selectedProjectId])

  useEffect(() => {
    queueMicrotask(() => {
      fetchProjectsAndMetrics()
    })
  }, [fetchProjectsAndMetrics])

  const handleProjectSubmit = async (data: Partial<Project>) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    if (data.id) {
      const { error } = await supabase
        .from('projects')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', data.id)
      if (error) {
        setErrorMessage(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('projects')
        .insert({ ...data, user_id: userData.user.id })
      if (error) {
        setErrorMessage(error.message)
        return
      }
    }

    setErrorMessage(null)
    fetchProjectsAndMetrics()
    setEditingProject(null)
  }

  const handleProjectDelete = async (projectId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null)
    }
    setErrorMessage(null)
    fetchProjectsAndMetrics()
  }

  const handleProjectMetricSubmit = async (data: Partial<ProjectMetric>) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    if (data.id) {
      const { error } = await supabase
        .from('project_metrics')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', data.id)
      if (error) {
        setErrorMessage(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('project_metrics').insert({
        ...data,
        user_id: userData.user.id,
      })
      if (error) {
        setErrorMessage(error.message)
        return
      }
    }

    setErrorMessage(null)
    fetchProjectsAndMetrics()
    setEditingMetric(null)
  }

  const handleProjectMetricDelete = async (metricId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('project_metrics').delete().eq('id', metricId)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage(null)
    fetchProjectsAndMetrics()
  }

  const currentMetricNames = Array.from(new Set(projectMetrics.map((metric) => metric.metric_name)))
  const compareMetricNames = Array.from(new Set(compareMetrics.map((metric) => metric.metric_name)))
  const metricNames = Array.from(new Set([...currentMetricNames, ...compareMetricNames]))

  const chartData = metricNames.map((metricName) => {
    const current = sum(
      projectMetrics
        .filter((metric) => metric.metric_name === metricName)
        .map((metric) => Number(metric.metric_value))
    )
    const previous = sum(
      compareMetrics
        .filter((metric) => metric.metric_name === metricName)
        .map((metric) => Number(metric.metric_value))
    )

    return {
      label: metricName,
      atual: current,
      comparativo: previous,
    }
  })

  const totalCurrentValue = sum(projectMetrics.map((metric) => Number(metric.metric_value)))
  const totalPreviousValue = sum(compareMetrics.map((metric) => Number(metric.metric_value)))
  const kpiMetrics: OrderedMetricOption[] = [
    {
      id: 'projects-active',
      title: 'Projetos ativos',
      value: projects.length,
      format: 'number',
      icon: <FolderKanban className="h-4 w-4" />,
      category: 'Projetos',
    },
    {
      id: 'projects-metrics-count',
      title: 'Metricas no periodo',
      value: projectMetrics.length,
      format: 'number',
      icon: <ChartNoAxesCombined className="h-4 w-4" />,
      category: 'Projetos',
    },
    {
      id: 'projects-total-value',
      title: 'Valor total das metricas',
      value: totalCurrentValue,
      previousValue: totalPreviousValue,
      trend: calculateTrend(totalCurrentValue, totalPreviousValue),
      format: 'number',
      icon: <TrendingUp className="h-4 w-4" />,
      category: 'Projetos',
    },
    ...chartData.map((metric): OrderedMetricOption => ({
      id: `project-custom-${metric.label}`,
      title: metric.label,
      value: metric.atual,
      previousValue: metric.comparativo,
      trend: calculateTrend(metric.atual, metric.comparativo),
      format: 'number',
      icon: <ChartNoAxesCombined className="h-4 w-4" />,
      category: selectedProject ? `Metricas: ${selectedProject.name}` : 'Metricas do projeto',
    })),
  ]

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Projetos de Marketing"
        subtitle="Crie projetos especificos e acompanhe metricas customizadas por data"
      />

      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <DateFilter
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => { setEditingProject(null); setProjectDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
            <Button
              variant="outline"
              disabled={!selectedProjectId}
              onClick={() => { setEditingMetric(null); setProjectMetricDialogOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Metrica
            </Button>
          </div>
        </div>
        {errorMessage && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <MetricOrderControl
          key={selectedProjectId || 'all-projects'}
          storageKey={`avalyst-dashboard-kpis-projects-${selectedProjectId || 'all'}`}
          metrics={kpiMetrics}
          defaultMetricIds={[
            'projects-active',
            'projects-metrics-count',
            'projects-total-value',
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de projetos</CardTitle>
            <CardDescription>
              Selecione um projeto para visualizar o comparativo das metricas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto criado ate o momento.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedProjectId(project.id)
                      }
                    }}
                    className={`rounded-md border p-4 text-left transition-colors ${
                      selectedProjectId === project.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.description || 'Sem descricao'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditingProject(project)
                            setProjectDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleProjectDelete(project.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProject ? `Metricas do projeto: ${selectedProject.name}` : 'Metricas do projeto'}
            </CardTitle>
            <CardDescription>
              Comparativo entre periodo atual e periodo anterior para as metricas cadastradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedProjectId ? (
              <>
                <ComparisonChart
                  title="Comparativo por metrica"
                  data={chartData}
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Metrica</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Carregando dados...
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {projectMetrics.map((metric) => (
                          <TableRow key={metric.id}>
                            <TableCell>{metric.reference_date}</TableCell>
                            <TableCell>{metric.metric_name}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('pt-BR').format(Number(metric.metric_value))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => { setEditingMetric(metric); setProjectMetricDialogOpen(true) }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleProjectMetricDelete(metric.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {projectMetrics.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhuma metrica encontrada para o periodo.
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Crie e selecione um projeto para visualizar os indicadores.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={editingProject}
        onSubmit={handleProjectSubmit}
      />
      <ProjectMetricFormDialog
        open={projectMetricDialogOpen}
        onOpenChange={setProjectMetricDialogOpen}
        metric={editingMetric}
        projectId={selectedProjectId || ''}
        onSubmit={handleProjectMetricSubmit}
      />
    </div>
  )
}
