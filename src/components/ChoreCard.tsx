import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, Calendar, CalendarBlank, CalendarCheck } from '@phosphor-icons/react'
import { Chore } from '@/lib/types'
import { isChoreActive } from '@/lib/helpers'

interface ChoreCardProps {
  chore: Chore
  onEdit: (chore: Chore) => void
  onDelete: (choreId: string) => void
}

export function ChoreCard({ chore, onEdit, onDelete }: ChoreCardProps) {
  const active = isChoreActive(chore)
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className={!active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-fredoka">{chore.name}</CardTitle>
              {!active && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {chore.description && (
              <p className="text-sm text-muted-foreground mt-1">{chore.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(chore)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(chore.id)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="secondary" className="font-fredoka text-base">
            {chore.points} pts
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{chore.frequency}</span>
          </div>
          {chore.startDate && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarBlank className="h-4 w-4" />
              <span>Starts {formatDate(chore.startDate)}</span>
            </div>
          )}
          {chore.endDate && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarCheck className="h-4 w-4" />
              <span>Ends {formatDate(chore.endDate)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
