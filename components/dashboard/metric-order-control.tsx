'use client'

import { type DragEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Check,
  GripVertical,
  ListChecks,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KPICard } from '@/components/dashboard/kpi-card'
import { cn } from '@/lib/utils'

export type OrderedMetricOption = {
  id: string
  title: string
  value: string | number
  previousValue?: string | number
  format?: 'number' | 'currency' | 'percent'
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?: ReactNode
  category: string
  description?: string
}

type MetricOrderControlProps = {
  storageKey: string
  metrics: OrderedMetricOption[]
  defaultMetricIds?: string[]
  maxSlots?: number
}

type CustomMetric = {
  id: string
  title: string
  value: number
  previousValue?: number
  format: 'number' | 'currency' | 'percent'
  category: string
  description?: string
}

type DragPayload = {
  kind: 'option' | 'slot'
  id: string
}

const dragMimeType = 'application/x-avalyst-metric'
const customMetricsStorageKey = 'avalyst-dashboard-custom-metrics'
const categoryAssignmentsStorageKey = 'avalyst-dashboard-metric-category-assignments'

const sharedCategories = [
  'Visao Geral',
  'Funil',
  'Conversao',
  'Custos',
  'Vendas',
  'Performance',
  'Performance ADS',
  'Volume',
  'Investimento',
  'CRM',
  'Status',
  'Funil comercial',
  'E-mail Marketing',
  'SEO',
  'Instagram',
  'LinkedIn',
  'Projetos',
  'Metricas do projeto',
  'Customizadas',
]

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function getMetricKey(metric: Pick<OrderedMetricOption, 'title'>) {
  return metric.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeCategory(category: string) {
  return sharedCategories.includes(category) ? category : 'Customizadas'
}

function getFallbackIds(
  metrics: OrderedMetricOption[],
  defaultMetricIds: string[] | undefined,
  maxSlots: number
) {
  const availableIds = new Set(metrics.map((metric) => metric.id))
  return (defaultMetricIds || metrics.slice(0, maxSlots).map((metric) => metric.id))
    .filter((id) => availableIds.has(id))
    .slice(0, maxSlots)
}

function getInitialSelectedIds(
  storageKey: string,
  metrics: OrderedMetricOption[],
  defaultMetricIds: string[] | undefined,
  maxSlots: number
) {
  const customMetrics = readJson<CustomMetric[]>(customMetricsStorageKey, [])
  const availableIds = new Set([
    ...metrics.map((metric) => metric.id),
    ...customMetrics.map((metric) => metric.id),
  ])
  const fallbackIds = getFallbackIds(metrics, defaultMetricIds, maxSlots)
  const storedIds = readJson<string[]>(storageKey, [])
  const validStoredIds = storedIds
    .filter((id) => availableIds.has(id))
    .slice(0, maxSlots)

  return validStoredIds.length > 0 ? validStoredIds : fallbackIds
}

function getGridClassName(count: number) {
  if (count <= 1) return 'grid gap-4 md:grid-cols-1'
  if (count === 2) return 'grid gap-4 md:grid-cols-2'
  if (count === 3) return 'grid gap-4 md:grid-cols-3'
  if (count === 4) return 'grid gap-4 md:grid-cols-2 xl:grid-cols-4'

  return 'grid gap-4 md:grid-cols-2 xl:grid-cols-5'
}

function parseDragPayload(event: DragEvent<HTMLElement>) {
  try {
    return JSON.parse(event.dataTransfer.getData(dragMimeType)) as DragPayload
  } catch {
    return null
  }
}

function customMetricToOption(metric: CustomMetric): OrderedMetricOption {
  return {
    id: metric.id,
    title: metric.title,
    value: metric.value,
    previousValue: metric.previousValue,
    format: metric.format,
    category: metric.category,
    description: metric.description || 'Metrica criada no modal.',
  }
}

export function MetricOrderControl({
  storageKey,
  metrics,
  defaultMetricIds,
  maxSlots = 5,
}: MetricOrderControlProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (
    getInitialSelectedIds(storageKey, metrics, defaultMetricIds, maxSlots)
  ))
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(() => (
    readJson<CustomMetric[]>(customMetricsStorageKey, [])
  ))
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string>>(() => (
    readJson<Record<string, string>>(categoryAssignmentsStorageKey, {})
  ))
  const [newMetricTitle, setNewMetricTitle] = useState('')
  const [newMetricValue, setNewMetricValue] = useState('')
  const [newMetricFormat, setNewMetricFormat] = useState<CustomMetric['format']>('number')
  const [newMetricCategory, setNewMetricCategory] = useState('Customizadas')

  const allMetrics = useMemo(() => {
    const builtInMetrics = metrics.map((metric) => {
      const metricKey = getMetricKey(metric)
      return {
        ...metric,
        category: normalizeCategory(categoryAssignments[metricKey] || metric.category),
      }
    })

    const customOptions = customMetrics.map((metric) => {
      const metricKey = getMetricKey(metric)
      return {
        ...customMetricToOption(metric),
        category: normalizeCategory(categoryAssignments[metricKey] || metric.category),
      }
    })

    return [...builtInMetrics, ...customOptions]
  }, [categoryAssignments, customMetrics, metrics])

  const metricById = useMemo(
    () => new Map(allMetrics.map((metric) => [metric.id, metric])),
    [allMetrics]
  )
  const fallbackIds = useMemo(
    () => getFallbackIds(metrics, defaultMetricIds, maxSlots),
    [defaultMetricIds, maxSlots, metrics]
  )

  const groupedMetrics = useMemo(() => {
    return sharedCategories.reduce<Record<string, OrderedMetricOption[]>>((groups, category) => {
      groups[category] = allMetrics.filter((metric) => metric.category === category)
      return groups
    }, {})
  }, [allMetrics])

  useEffect(() => {
    writeJson(storageKey, selectedIds)
  }, [selectedIds, storageKey])

  useEffect(() => {
    writeJson(customMetricsStorageKey, customMetrics)
  }, [customMetrics])

  useEffect(() => {
    writeJson(categoryAssignmentsStorageKey, categoryAssignments)
  }, [categoryAssignments])

  const selectedMetrics = selectedIds
    .map((id) => metricById.get(id))
    .filter((metric): metric is OrderedMetricOption => Boolean(metric))

  const selectMetric = (metricId: string) => {
    setSelectedIds((currentIds) => {
      if (currentIds.includes(metricId)) {
        return currentIds.filter((id) => id !== metricId)
      }

      if (currentIds.length >= maxSlots) return currentIds

      return [...currentIds, metricId]
    })
  }

  const removeMetric = (metricId: string) => {
    setSelectedIds((currentIds) => currentIds.filter((id) => id !== metricId))
  }

  const moveMetric = (metricId: string, targetIndex: number) => {
    setSelectedIds((currentIds) => {
      const nextIds = currentIds.filter((id) => id !== metricId)
      nextIds.splice(Math.min(targetIndex, nextIds.length), 0, metricId)
      return nextIds.slice(0, maxSlots)
    })
  }

  const moveMetricToCategory = (metricId: string, category: string) => {
    const metric = metricById.get(metricId)
    if (!metric) return

    setCategoryAssignments((currentAssignments) => ({
      ...currentAssignments,
      [getMetricKey(metric)]: category,
    }))

    setCustomMetrics((currentMetrics) => (
      currentMetrics.map((customMetric) => (
        customMetric.id === metricId
          ? { ...customMetric, category }
          : customMetric
      ))
    ))
  }

  const resetMetrics = () => {
    setSelectedIds(fallbackIds)
  }

  const createCustomMetric = () => {
    const title = newMetricTitle.trim()
    const value = Number(newMetricValue.replace(',', '.'))

    if (!title || Number.isNaN(value)) return

    const metric: CustomMetric = {
      id: `custom-${Date.now()}`,
      title,
      value,
      format: newMetricFormat,
      category: newMetricCategory,
    }

    setCustomMetrics((currentMetrics) => [...currentMetrics, metric])
    setCategoryAssignments((currentAssignments) => ({
      ...currentAssignments,
      [getMetricKey(metric)]: newMetricCategory,
    }))
    setSelectedIds((currentIds) => (
      currentIds.length < maxSlots ? [...currentIds, metric.id] : currentIds
    ))
    setNewMetricTitle('')
    setNewMetricValue('')
    setNewMetricFormat('number')
    setNewMetricCategory('Customizadas')
  }

  const removeCustomMetric = (metricId: string) => {
    setCustomMetrics((currentMetrics) => currentMetrics.filter((metric) => metric.id !== metricId))
    removeMetric(metricId)
  }

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    payload: DragPayload
  ) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(dragMimeType, JSON.stringify(payload))
  }

  const handleDropOnSlot = (
    event: DragEvent<HTMLDivElement>,
    slotIndex: number
  ) => {
    event.preventDefault()
    const payload = parseDragPayload(event)
    if (!payload || !metricById.has(payload.id)) return
    moveMetric(payload.id, slotIndex)
  }

  const handleDropOnCategory = (
    event: DragEvent<HTMLDivElement>,
    category: string
  ) => {
    event.preventDefault()
    const payload = parseDragPayload(event)
    if (!payload || !metricById.has(payload.id)) return
    moveMetricToCategory(payload.id, category)
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ListChecks className="h-4 w-4" />
              Ordenar Metricas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Ordenar Metricas</DialogTitle>
              <DialogDescription>
                Escolha ate {maxSlots} metricas, crie indicadores manuais e arraste metricas entre categorias.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Slots em destaque</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedIds.length}/{maxSlots} selecionadas
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={resetMetrics}>
                    <RotateCcw className="h-4 w-4" />
                    Restaurar
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  {Array.from({ length: maxSlots }).map((_, index) => {
                    const metricId = selectedIds[index]
                    const metric = metricId ? metricById.get(metricId) : null

                    return (
                      <div
                        key={`slot-${index + 1}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDropOnSlot(event, index)}
                        className={cn(
                          'min-h-28 rounded-lg border border-dashed bg-muted/30 p-3 transition-colors',
                          metric && 'border-primary/40 bg-primary/5'
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Slot {index + 1}
                          </span>
                          {metric && (
                            <button
                              type="button"
                              className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                              onClick={() => removeMetric(metric.id)}
                              aria-label={`Remover ${metric.title}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {metric ? (
                          <div
                            role="button"
                            tabIndex={0}
                            draggable
                            onDragStart={(event) => handleDragStart(event, { kind: 'slot', id: metric.id })}
                            onKeyDown={(event) => {
                              if (event.key === 'ArrowLeft') moveMetric(metric.id, Math.max(0, index - 1))
                              if (event.key === 'ArrowRight') moveMetric(metric.id, Math.min(maxSlots - 1, index + 1))
                            }}
                            className="flex h-full cursor-grab flex-col justify-between rounded-md border bg-background p-3 shadow-sm active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-primary">{metric.icon}</div>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="mt-3 text-sm font-semibold leading-snug">{metric.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{metric.category}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-20 items-center justify-center rounded-md border bg-background/70 text-center text-xs text-muted-foreground">
                            Arraste uma metrica aqui
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Criar nova metrica</p>
                    <p className="text-xs text-muted-foreground">
                      A nova metrica fica disponivel em todas as paginas com este modal.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_140px_160px_180px_auto]">
                  <Input
                    value={newMetricTitle}
                    onChange={(event) => setNewMetricTitle(event.target.value)}
                    placeholder="Nome da metrica"
                  />
                  <Input
                    value={newMetricValue}
                    onChange={(event) => setNewMetricValue(event.target.value)}
                    inputMode="decimal"
                    placeholder="Valor"
                  />
                  <Select value={newMetricFormat} onValueChange={(value) => setNewMetricFormat(value as CustomMetric['format'])}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Numero</SelectItem>
                      <SelectItem value="currency">Moeda</SelectItem>
                      <SelectItem value="percent">Percentual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newMetricCategory} onValueChange={setNewMetricCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {sharedCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={createCustomMetric}>
                    <Plus className="h-4 w-4" />
                    Criar
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Categorias compartilhadas</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {sharedCategories.map((category) => {
                    const categoryCount = groupedMetrics[category]?.length || 0

                    return (
                      <div
                        key={category}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDropOnCategory(event, category)}
                        className="rounded-lg border border-dashed bg-background p-3 transition-colors hover:border-primary/60 hover:bg-primary/5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{category}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {categoryCount}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Arraste metricas para esta categoria.
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-5">
                {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                  <div
                    key={category}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDropOnCategory(event, category)}
                  >
                    <h3 className="mb-3 text-sm font-semibold">{category}</h3>
                    {categoryMetrics.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {categoryMetrics.map((metric) => {
                          const isSelected = selectedIds.includes(metric.id)
                          const isDisabled = !isSelected && selectedIds.length >= maxSlots
                          const isCustomMetric = customMetrics.some((customMetric) => customMetric.id === metric.id)

                          return (
                            <button
                              key={metric.id}
                              type="button"
                              draggable={!isDisabled}
                              disabled={isDisabled}
                              onDragStart={(event) => handleDragStart(event, { kind: 'option', id: metric.id })}
                              onClick={() => selectMetric(metric.id)}
                              className={cn(
                                'flex min-h-24 items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50',
                                isSelected && 'border-primary bg-primary/10'
                              )}
                            >
                              <span className="mt-0.5 text-primary">{metric.icon || <Plus className="h-4 w-4" />}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium leading-snug">{metric.title}</span>
                                {metric.description && (
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {metric.description}
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                                {isCustomMetric && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      removeCustomMetric(metric.id)
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        removeCustomMetric(metric.id)
                                      }
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </span>
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                        Nenhuma metrica nesta categoria. Arraste uma metrica para ca.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedMetrics.length > 0 ? (
        <div className={getGridClassName(selectedMetrics.length)}>
          {selectedMetrics.map((metric) => (
            <KPICard
              key={metric.id}
              title={metric.title}
              value={metric.value}
              previousValue={metric.previousValue}
              format={metric.format}
              trend={metric.trend}
              trendLabel={metric.trendLabel}
              icon={metric.icon}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Selecione pelo menos uma metrica para exibir os cards em destaque.
        </div>
      )}
    </section>
  )
}
