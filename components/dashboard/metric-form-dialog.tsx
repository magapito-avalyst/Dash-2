'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarketingMetric, MARKETING_SOURCES } from '@/lib/types'

interface MetricFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: MarketingMetric | null
  onSubmit: (data: Partial<MarketingMetric>) => Promise<void>
}

export function MetricFormDialog({
  open,
  onOpenChange,
  metric,
  onSubmit,
}: MetricFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    reference_date: '',
    source: 'Inbound',
    investimento: '',
    mqls: '',
    demo_agendadas: '',
    demo_realizadas: '',
    onboarding: '',
    ciclo_venda: '',
  })

  useEffect(() => {
    queueMicrotask(() => {
      if (metric) {
        setFormData({
          reference_date: metric.reference_date,
          source: metric.source,
          investimento: String(metric.investimento),
          mqls: String(metric.mqls),
          demo_agendadas: String(metric.demo_agendadas),
          demo_realizadas: String(metric.demo_realizadas),
          onboarding: String(metric.onboarding),
          ciclo_venda: String(metric.ciclo_venda),
        })
      } else {
        setFormData({
          reference_date: new Date().toISOString().split('T')[0],
          source: 'Inbound',
          investimento: '',
          mqls: '',
          demo_agendadas: '',
          demo_realizadas: '',
          onboarding: '',
          ciclo_venda: '',
        })
      }
    })
  }, [metric, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit({
        ...(metric && { id: metric.id }),
        reference_date: formData.reference_date,
        source: formData.source,
        investimento: parseFloat(formData.investimento) || 0,
        mqls: parseInt(formData.mqls) || 0,
        demo_agendadas: parseInt(formData.demo_agendadas) || 0,
        demo_realizadas: parseInt(formData.demo_realizadas) || 0,
        onboarding: parseInt(formData.onboarding) || 0,
        ciclo_venda: parseInt(formData.ciclo_venda) || 0,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {metric ? 'Editar Metrica' : 'Adicionar Metrica'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados de marketing para o periodo selecionado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_date">Data de Referencia</Label>
                <Input
                  id="reference_date"
                  type="date"
                  value={formData.reference_date}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Fonte</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investimento">Investimento (R$)</Label>
                <Input
                  id="investimento"
                  type="number"
                  step="0.01"
                  value={formData.investimento}
                  onChange={(e) =>
                    setFormData({ ...formData, investimento: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mqls">MQLs</Label>
                <Input
                  id="mqls"
                  type="number"
                  value={formData.mqls}
                  onChange={(e) =>
                    setFormData({ ...formData, mqls: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo_agendadas">DEMO Agendadas</Label>
                <Input
                  id="demo_agendadas"
                  type="number"
                  value={formData.demo_agendadas}
                  onChange={(e) =>
                    setFormData({ ...formData, demo_agendadas: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo_realizadas">DEMO Realizadas</Label>
                <Input
                  id="demo_realizadas"
                  type="number"
                  value={formData.demo_realizadas}
                  onChange={(e) =>
                    setFormData({ ...formData, demo_realizadas: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="onboarding">Onboarding</Label>
                <Input
                  id="onboarding"
                  type="number"
                  value={formData.onboarding}
                  onChange={(e) =>
                    setFormData({ ...formData, onboarding: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ciclo_venda">Ciclo de Venda (dias)</Label>
                <Input
                  id="ciclo_venda"
                  type="number"
                  value={formData.ciclo_venda}
                  onChange={(e) =>
                    setFormData({ ...formData, ciclo_venda: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
