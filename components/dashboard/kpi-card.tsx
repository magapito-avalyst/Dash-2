'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  previousValue?: string | number
  format?: 'number' | 'currency' | 'percent'
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?: React.ReactNode
}

function formatValue(value: string | number, format: KPICardProps['format'] = 'number'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return String(value)
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(numValue)
    case 'percent':
      return `${numValue.toFixed(2)}%`
    default:
      return new Intl.NumberFormat('pt-BR').format(numValue)
  }
}

export function KPICard({
  title,
  value,
  previousValue,
  format = 'number',
  trend,
  trendLabel,
  icon,
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value, format)}</div>
        {(trend || previousValue !== undefined || trendLabel) && (
          <div className="flex items-center gap-1 mt-1">
            {trend && <TrendIcon className={cn('h-4 w-4', trendColor)} />}
            <span className={cn('text-xs', trendColor)}>
              {trendLabel || (previousValue !== undefined ? `vs ${formatValue(previousValue, format)}` : '')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
