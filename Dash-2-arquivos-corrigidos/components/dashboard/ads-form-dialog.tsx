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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ADSMetric, ADS_PLATFORMS } from '@/lib/types'

interface ADSFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: ADSMetric | null
  onSubmit: (data: Partial<ADSMetric>) => Promise<void>
}

export function ADSFormDialog({
  open,
  onOpenChange,
  metric,
  onSubmit,
}: ADSFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    reference_date: '',
    platform: 'google',
    taxa_conversao: '',
    taxa_clique: '',
    impressoes: '',
    cliques: '',
    custo_clique: '',
    custo_aquisicao: '',
    investimento: '',
  })

  useEffect(() => {
    queueMicrotask(() => {
      if (metric) {
        setFormData({
          reference_date: metric.reference_date,
          platform: metric.platform,
          taxa_conversao: String(metric.taxa_conversao),
          taxa_clique: String(metric.taxa_clique),
          impressoes: String(metric.impressoes),
          cliques: String(metric.cliques),
          custo_clique: String(metric.custo_clique),
          custo_aquisicao: String(metric.custo_aquisicao),
          investimento: String(metric.investimento),
        })
      } else {
        setFormData({
          reference_date: new Date().toISOString().split('T')[0],
          platform: 'google',
          taxa_conversao: '',
          taxa_clique: '',
          impressoes: '',
          cliques: '',
          custo_clique: '',
          custo_aquisicao: '',
          investimento: '',
        })
      }
    })
  }, [metric, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      await onSubmit({
        ...(metric && { id: metric.id }),
        reference_date: formData.reference_date,
        platform: formData.platform,
        taxa_conversao: parseFloat(formData.taxa_conversao) || 0,
        taxa_clique: parseFloat(formData.taxa_clique) || 0,
        impressoes: parseInt(formData.impressoes) || 0,
        cliques: parseInt(formData.cliques) || 0,
        custo_clique: parseFloat(formData.custo_clique) || 0,
        custo_aquisicao: parseFloat(formData.custo_aquisicao) || 0,
        investimento: parseFloat(formData.investimento) || 0,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{metric ? 'Editar KPI de ADS' : 'Adicionar KPI de ADS'}</DialogTitle>
          <DialogDescription>
            Registre os indicadores de campanhas pagas para o periodo selecionado.
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
                  onChange={(event) => setFormData({ ...formData, reference_date: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Plataforma</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADS_PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxa_conversao">Taxa de Conversao (%)</Label>
                <Input
                  id="taxa_conversao"
                  type="number"
                  step="0.01"
                  value={formData.taxa_conversao}
                  onChange={(event) => setFormData({ ...formData, taxa_conversao: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa_clique">Taxa de Clique (%)</Label>
                <Input
                  id="taxa_clique"
                  type="number"
                  step="0.01"
                  value={formData.taxa_clique}
                  onChange={(event) => setFormData({ ...formData, taxa_clique: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impressoes">Impressoes</Label>
                <Input
                  id="impressoes"
                  type="number"
                  value={formData.impressoes}
                  onChange={(event) => setFormData({ ...formData, impressoes: event.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliques">Cliques</Label>
                <Input
                  id="cliques"
                  type="number"
                  value={formData.cliques}
                  onChange={(event) => setFormData({ ...formData, cliques: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custo_clique">Custo por Clique (R$)</Label>
                <Input
                  id="custo_clique"
                  type="number"
                  step="0.01"
                  value={formData.custo_clique}
                  onChange={(event) => setFormData({ ...formData, custo_clique: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custo_aquisicao">Custo por Aquisicao (R$)</Label>
                <Input
                  id="custo_aquisicao"
                  type="number"
                  step="0.01"
                  value={formData.custo_aquisicao}
                  onChange={(event) => setFormData({ ...formData, custo_aquisicao: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investimento">Investimento (R$)</Label>
              <Input
                id="investimento"
                type="number"
                step="0.01"
                value={formData.investimento}
                onChange={(event) => setFormData({ ...formData, investimento: event.target.value })}
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
