'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProjectMetric } from '@/lib/types'

interface ProjectMetricFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: ProjectMetric | null
  projectId: string
  onSubmit: (data: Partial<ProjectMetric>) => Promise<void>
}

export function ProjectMetricFormDialog({
  open,
  onOpenChange,
  metric,
  projectId,
  onSubmit,
}: ProjectMetricFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    reference_date: '',
    metric_name: '',
    metric_value: '',
  })

  useEffect(() => {
    queueMicrotask(() => {
      if (metric) {
        setFormData({
          reference_date: metric.reference_date,
          metric_name: metric.metric_name,
          metric_value: String(metric.metric_value),
        })
        return
      }

      setFormData({
        reference_date: new Date().toISOString().split('T')[0],
        metric_name: '',
        metric_value: '',
      })
    })
  }, [metric, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit({
        ...(metric && { id: metric.id }),
        project_id: projectId,
        reference_date: formData.reference_date,
        metric_name: formData.metric_name,
        metric_value: parseFloat(formData.metric_value) || 0,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{metric ? 'Editar Metrica do Projeto' : 'Adicionar Metrica ao Projeto'}</DialogTitle>
          <DialogDescription>
            Defina qual indicador deseja acompanhar e registre os valores por data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference_date">Data de Referencia</Label>
              <Input
                id="reference_date"
                type="date"
                value={formData.reference_date}
                onChange={(event) => setFormData({ ...formData, reference_date: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric_name">Nome da metrica</Label>
              <Input
                id="metric_name"
                value={formData.metric_name}
                onChange={(event) => setFormData({ ...formData, metric_name: event.target.value })}
                placeholder="Ex.: Conversoes LP"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric_value">Valor da metrica</Label>
              <Input
                id="metric_value"
                type="number"
                step="0.01"
                value={formData.metric_value}
                onChange={(event) => setFormData({ ...formData, metric_value: event.target.value })}
                placeholder="0"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
