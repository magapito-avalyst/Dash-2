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

type DragPayload = {
  kind: 'option' | 'slot'
  id: string
}

const dragMimeType = 'application/x-avalyst-metric'

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
  const fallbackIds = getFallbackIds(metrics, defaultMetricIds, maxSlots)

  if (typeof window === 'undefined') return fallbackIds

  const availableIds = new Set(metrics.map((metric) => metric.id))
  const storedValue = window.localStorage.getItem(storageKey)
  let storedIds: string[] = []

  try {
    storedIds = storedValue ? JSON.parse(storedValue) as string[] : []
  } catch {
    storedIds = []
  }

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

export function MetricOrderControl({
  storageKey,
  metrics,
  defaultMetricIds,
  maxSlots = 5,
}: MetricOrderControlProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (
    getInitialSelectedIds(storageKey, metrics, defaultMetricIds, maxSlots)
  ))

  const metricById = useMemo(
    () => new Map(metrics.map((metric) => [metric.id, metric])),
    [metrics]
  )
  const fallbackIds = useMemo(
    () => getFallbackIds(metrics, defaultMetricIds, maxSlots),
    [defaultMetricIds, maxSlots, metrics]
  )

  const groupedMetrics = useMemo(() => {
    return metrics.reduce<Record<string, OrderedMetricOption[]>>((groups, metric) => {
      groups[metric.category] = groups[metric.category] || []
      groups[metric.category].push(metric)
      return groups
    }, {})
  }, [metrics])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(selectedIds))
  }, [selectedIds, storageKey])

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

  const resetMetrics = () => {
    setSelectedIds(fallbackIds)
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

  return (
    <section className="mb-8">
      <div className="mb-4 flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ListChecks className="h-4 w-4" />
              Ordenar Métricas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Ordenar Métricas</DialogTitle>
              <DialogDescription>
                Escolha até {maxSlots} métricas e arraste os slots para mudar a ordem dos cards em destaque.
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
                            Arraste uma métrica aqui
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-5">
                {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                  <div key={category}>
                    <h3 className="mb-3 text-sm font-semibold">{category}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {categoryMetrics.map((metric) => {
                        const isSelected = selectedIds.includes(metric.id)
                        const isDisabled = !isSelected && selectedIds.length >= maxSlots

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
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        )
                      })}
                    </div>
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
