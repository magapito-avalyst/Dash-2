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
import { ContentMetric, CONTENT_CHANNELS } from '@/lib/types'

interface ContentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: ContentMetric | null
  onSubmit: (data: Partial<ContentMetric>) => Promise<void>
  defaultChannel?: string
}

export function ContentFormDialog({
  open,
  onOpenChange,
  metric,
  onSubmit,
  defaultChannel = 'email_marketing',
}: ContentFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    reference_date: '',
    channel: defaultChannel,
    // Email Marketing
    taxa_entrega: '',
    taxa_hard_bounce: '',
    taxa_abertura: '',
    taxa_clique: '',
    taxa_conversao: '',
    // SEO
    trafego_organico: '',
    sessoes: '',
    usuarios: '',
    palavras_indexadas: '',
    tempo_pagina: '',
    desempenho_site: '',
    // Social
    conversao_lead: '',
  })

  useEffect(() => {
    queueMicrotask(() => {
      if (metric) {
        setFormData({
          reference_date: metric.reference_date,
          channel: metric.channel,
          taxa_entrega: String(metric.taxa_entrega),
          taxa_hard_bounce: String(metric.taxa_hard_bounce),
          taxa_abertura: String(metric.taxa_abertura),
          taxa_clique: String(metric.taxa_clique),
          taxa_conversao: String(metric.taxa_conversao),
          trafego_organico: String(metric.trafego_organico),
          sessoes: String(metric.sessoes),
          usuarios: String(metric.usuarios),
          palavras_indexadas: String(metric.palavras_indexadas),
          tempo_pagina: String(metric.tempo_pagina),
          desempenho_site: String(metric.desempenho_site),
          conversao_lead: String(metric.conversao_lead),
        })
      } else {
        setFormData({
          reference_date: new Date().toISOString().split('T')[0],
          channel: defaultChannel,
          taxa_entrega: '',
          taxa_hard_bounce: '',
          taxa_abertura: '',
          taxa_clique: '',
          taxa_conversao: '',
          trafego_organico: '',
          sessoes: '',
          usuarios: '',
          palavras_indexadas: '',
          tempo_pagina: '',
          desempenho_site: '',
          conversao_lead: '',
        })
      }
    })
  }, [metric, open, defaultChannel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit({
        ...(metric && { id: metric.id }),
        reference_date: formData.reference_date,
        channel: formData.channel as ContentMetric['channel'],
        taxa_entrega: parseFloat(formData.taxa_entrega) || 0,
        taxa_hard_bounce: parseFloat(formData.taxa_hard_bounce) || 0,
        taxa_abertura: parseFloat(formData.taxa_abertura) || 0,
        taxa_clique: parseFloat(formData.taxa_clique) || 0,
        taxa_conversao: parseFloat(formData.taxa_conversao) || 0,
        trafego_organico: parseInt(formData.trafego_organico) || 0,
        sessoes: parseInt(formData.sessoes) || 0,
        usuarios: parseInt(formData.usuarios) || 0,
        palavras_indexadas: parseInt(formData.palavras_indexadas) || 0,
        tempo_pagina: parseFloat(formData.tempo_pagina) || 0,
        desempenho_site: parseFloat(formData.desempenho_site) || 0,
        conversao_lead: parseInt(formData.conversao_lead) || 0,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const renderChannelFields = () => {
    switch (formData.channel) {
      case 'email_marketing':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxa_entrega">Taxa de Entrega (%)</Label>
                <Input
                  id="taxa_entrega"
                  type="number"
                  step="0.01"
                  value={formData.taxa_entrega}
                  onChange={(e) => setFormData({ ...formData, taxa_entrega: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa_hard_bounce">Taxa Hard Bounce (%)</Label>
                <Input
                  id="taxa_hard_bounce"
                  type="number"
                  step="0.01"
                  value={formData.taxa_hard_bounce}
                  onChange={(e) => setFormData({ ...formData, taxa_hard_bounce: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxa_abertura">Taxa Abertura (%)</Label>
                <Input
                  id="taxa_abertura"
                  type="number"
                  step="0.01"
                  value={formData.taxa_abertura}
                  onChange={(e) => setFormData({ ...formData, taxa_abertura: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa_clique">Taxa Clique (%)</Label>
                <Input
                  id="taxa_clique"
                  type="number"
                  step="0.01"
                  value={formData.taxa_clique}
                  onChange={(e) => setFormData({ ...formData, taxa_clique: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa_conversao">Taxa Conversao (%)</Label>
                <Input
                  id="taxa_conversao"
                  type="number"
                  step="0.01"
                  value={formData.taxa_conversao}
                  onChange={(e) => setFormData({ ...formData, taxa_conversao: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
          </>
        )
      case 'seo':
        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trafego_organico">Trafego Organico</Label>
                <Input
                  id="trafego_organico"
                  type="number"
                  value={formData.trafego_organico}
                  onChange={(e) => setFormData({ ...formData, trafego_organico: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessoes">Sessoes</Label>
                <Input
                  id="sessoes"
                  type="number"
                  value={formData.sessoes}
                  onChange={(e) => setFormData({ ...formData, sessoes: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usuarios">Usuarios</Label>
                <Input
                  id="usuarios"
                  type="number"
                  value={formData.usuarios}
                  onChange={(e) => setFormData({ ...formData, usuarios: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="palavras_indexadas">Palavras Indexadas</Label>
                <Input
                  id="palavras_indexadas"
                  type="number"
                  value={formData.palavras_indexadas}
                  onChange={(e) => setFormData({ ...formData, palavras_indexadas: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempo_pagina">Tempo na Pagina (seg)</Label>
                <Input
                  id="tempo_pagina"
                  type="number"
                  step="0.01"
                  value={formData.tempo_pagina}
                  onChange={(e) => setFormData({ ...formData, tempo_pagina: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desempenho_site">Desempenho Site (%)</Label>
                <Input
                  id="desempenho_site"
                  type="number"
                  step="0.01"
                  value={formData.desempenho_site}
                  onChange={(e) => setFormData({ ...formData, desempenho_site: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </>
        )
      case 'instagram':
      case 'linkedin':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trafego_organico">Trafego/Sessoes</Label>
                <Input
                  id="trafego_organico"
                  type="number"
                  value={formData.trafego_organico}
                  onChange={(e) => setFormData({ ...formData, trafego_organico: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conversao_lead">Conversao de Lead</Label>
                <Input
                  id="conversao_lead"
                  type="number"
                  value={formData.conversao_lead}
                  onChange={(e) => setFormData({ ...formData, conversao_lead: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxa_conversao">Taxa de Conversao (%)</Label>
              <Input
                id="taxa_conversao"
                type="number"
                step="0.01"
                value={formData.taxa_conversao}
                onChange={(e) => setFormData({ ...formData, taxa_conversao: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {metric ? 'Editar Metrica de Conteudo' : 'Adicionar Metrica de Conteudo'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do canal de conteudo selecionado.
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
                  onChange={(e) => setFormData({ ...formData, reference_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {renderChannelFields()}
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
