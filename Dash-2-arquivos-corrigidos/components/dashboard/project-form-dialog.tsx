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
import { Textarea } from '@/components/ui/textarea'
import { Project } from '@/lib/types'

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onSubmit: (data: Partial<Project>) => Promise<void>
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: ProjectFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    queueMicrotask(() => {
      if (project) {
        setName(project.name)
        setDescription(project.description ?? '')
        return
      }

      setName('')
      setDescription('')
    })
  }, [project, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      await onSubmit({
        ...(project && { id: project.id }),
        name,
        description: description.trim() || null,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projeto' : 'Criar Projeto'}</DialogTitle>
          <DialogDescription>
            Crie iniciativas especificas para acompanhar metricas de campanhas, landing pages e acoes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome do projeto</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: LP Campanha Black Friday"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Descricao</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contexto e objetivo do projeto"
                rows={4}
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
