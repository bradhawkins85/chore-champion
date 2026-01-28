import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, Calendar, CalendarBlank, CalendarCheck, SunHorizon, MoonStars, ClockCounterClockwise, Users, Trophy, Repeat } from '@phosphor-icons/react'
import { Chore, DayOfWeek } from '@/lib/types'
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

  const getTimeOfDayBadge = () => {
    switch (chore.timeOfDay) {
      case 'am':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <SunHorizon className="h-3 w-3" />
            AM Only
          </Badge>
        )
      case 'pm':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <MoonStars className="h-3 w-3" />
            PM Only
          </Badge>
        )
      case 'both':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <ClockCounterClockwise className="h-3 w-3" />
            AM & PM
          </Badge>
        )
      default:
        return null
    }
  }

  const getCompletionTypeBadge = () => {
    switch (chore.completionType) {
      case 'shareable':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Shareable
          </Badge>
        )
      case 'once-per-day':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            Once Per Day
          </Badge>
        )
      default:
        return null
    }
  }

  const getDaysOfWeekDisplay = () => {
    if (chore.repeatPattern) {
      return null
    }
    if (!chore.daysOfWeek || chore.daysOfWeek.length === 0) {
      return null
    }
    const dayLabels: Record<DayOfWeek, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {chore.daysOfWeek.map(d => dayLabels[d]).join(', ')}
      </Badge>
    )
  }

  const getRepeatPatternDisplay = () => {
    if (!chore.repeatPattern) {
      return null
    }

    const pattern = chore.repeatPattern
    const dayLabels: Record<DayOfWeek, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    }

    const intervalText = pattern.interval === 2 ? 'Every other' : `Every ${pattern.interval}`
    
    let displayText = `${intervalText} week`
    if (pattern.specificDays && pattern.specificDays.length > 0) {
      const days = pattern.specificDays.map(d => dayLabels[d]).join(', ')
      displayText = `${intervalText} ${pattern.specificDays.length === 1 ? days : `week: ${days}`}`
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Repeat className="h-3 w-3" />
        {displayText}
      </Badge>
    )
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-fredoka text-base">
              {chore.points} pts
            </Badge>
            {chore.pointOverrides && chore.pointOverrides.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Custom for {chore.pointOverrides.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{chore.frequency}</span>
          </div>
          {getRepeatPatternDisplay()}
          {getDaysOfWeekDisplay()}
          {getTimeOfDayBadge()}
          {getCompletionTypeBadge()}
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
