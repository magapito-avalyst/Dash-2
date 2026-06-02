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
import { CRMMetric } from '@/lib/types'

interface CRMFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: CRMMetric | null
  onSubmit: (data: Partial<CRMMetric>) => Promise<void>
}

export function CRMFormDialog({
  open,
  onOpenChange,
  metric,
  onSubmit,
}: CRMFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    reference_date: '',
    novos_leads: '',
    status_won: '',
    status_lost: '',
    fase_novos_leads: '',
    fase_discovery: '',
    fase_qualificacao: '',
    fase_cadencia: '',
    fase_conexao: '',
    fase_reuniao_agendada: '',
  })

  useEffect(() => {
    queueMicrotask(() => {
      if (metric) {
        setFormData({
          reference_date: metric.reference_date,
          novos_leads: String(metric.novos_leads),
          status_won: String(metric.status_won),
          status_lost: String(metric.status_lost),
          fase_novos_leads: String(metric.fase_novos_leads),
          fase_discovery: String(metric.fase_discovery),
          fase_qualificacao: String(metric.fase_qualificacao),
          fase_cadencia: String(metric.fase_cadencia),
          fase_conexao: String(metric.fase_conexao),
          fase_reuniao_agendada: String(metric.fase_reuniao_agendada),
        })
      } else {
        setFormData({
          reference_date: new Date().toISOString().split('T')[0],
          novos_leads: '',
          status_won: '',
          status_lost: '',
          fase_novos_leads: '',
          fase_discovery: '',
          fase_qualificacao: '',
          fase_cadencia: '',
          fase_conexao: '',
          fase_reuniao_agendada: '',
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
        novos_leads: parseInt(formData.novos_leads) || 0,
        status_won: parseInt(formData.status_won) || 0,
        status_lost: parseInt(formData.status_lost) || 0,
        fase_novos_leads: parseInt(formData.fase_novos_leads) || 0,
        fase_discovery: parseInt(formData.fase_discovery) || 0,
        fase_qualificacao: parseInt(formData.fase_qualificacao) || 0,
        fase_cadencia: parseInt(formData.fase_cadencia) || 0,
        fase_conexao: parseInt(formData.fase_conexao) || 0,
        fase_reuniao_agendada: parseInt(formData.fase_reuniao_agendada) || 0,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{metric ? 'Editar KPI de CRM' : 'Adicionar KPI de CRM'}</DialogTitle>
          <DialogDescription>
            Registre os indicadores de CRM para o periodo selecionado.
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="novos_leads">Novos Leads</Label>
                <Input
                  id="novos_leads"
                  type="number"
                  value={formData.novos_leads}
                  onChange={(event) => setFormData({ ...formData, novos_leads: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_won">WON</Label>
                <Input
                  id="status_won"
                  type="number"
                  value={formData.status_won}
                  onChange={(event) => setFormData({ ...formData, status_won: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_lost">LOST</Label>
                <Input
                  id="status_lost"
                  type="number"
                  value={formData.status_lost}
                  onChange={(event) => setFormData({ ...formData, status_lost: event.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fase_novos_leads">Fase: Novos Leads</Label>
                <Input
                  id="fase_novos_leads"
                  type="number"
                  value={formData.fase_novos_leads}
                  onChange={(event) => setFormData({ ...formData, fase_novos_leads: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fase_discovery">Fase: Discovery</Label>
                <Input
                  id="fase_discovery"
                  type="number"
                  value={formData.fase_discovery}
                  onChange={(event) => setFormData({ ...formData, fase_discovery: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fase_qualificacao">Fase: Qualificacao</Label>
                <Input
                  id="fase_qualificacao"
                  type="number"
                  value={formData.fase_qualificacao}
                  onChange={(event) => setFormData({ ...formData, fase_qualificacao: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fase_cadencia">Fase: Cadencia</Label>
                <Input
                  id="fase_cadencia"
                  type="number"
                  value={formData.fase_cadencia}
                  onChange={(event) => setFormData({ ...formData, fase_cadencia: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fase_conexao">Fase: Conexao</Label>
                <Input
                  id="fase_conexao"
                  type="number"
                  value={formData.fase_conexao}
                  onChange={(event) => setFormData({ ...formData, fase_conexao: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fase_reuniao_agendada">Fase: Reuniao Agendada</Label>
                <Input
                  id="fase_reuniao_agendada"
                  type="number"
                  value={formData.fase_reuniao_agendada}
                  onChange={(event) =>
                    setFormData({ ...formData, fase_reuniao_agendada: event.target.value })
                  }
                />
              </div>
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
