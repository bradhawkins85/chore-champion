import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, Calendar, CalendarBlank, CalendarCheck, SunHorizon, MoonStars, ClockCounterClockwise, Users, Trophy, Repeat, Clock, Timer, CloudSun, Sun, CalendarX } from '@phosphor-icons/react'
import { Chore, DayOfWeek, Category } from '@/lib/types'
import { isChoreActive, formatTime12Hour, formatDuration } from '@/lib/helpers'
import { getWeatherConditionLabel } from '@/lib/weatherChoreHelper'

interface ChoreCardProps {
  chore: Chore
  onEdit: (chore: Chore) => void
  onDelete: (choreId: string) => void
  categories?: Category[]
}

export function ChoreCard({ chore, onEdit, onDelete, categories = [] }: ChoreCardProps) {
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
            {chore.maxCompletions && ` (max ${chore.maxCompletions})`}
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

  const getTimeWindowBadge = () => {
    if (!chore.timeWindow) {
      return null
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatTime12Hour(chore.timeWindow.startTime)} - {formatTime12Hour(chore.timeWindow.endTime)}
      </Badge>
    )
  }

  const getWeatherBadge = () => {
    if (!chore.weatherConditions || !chore.weatherConditions.conditions || chore.weatherConditions.conditions.length === 0) {
      return null
    }
    
    const label = getWeatherConditionLabel(chore.weatherConditions.conditions)
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <CloudSun className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getHolidayBadges = () => {
    const badges = []
    if (chore.onlyOnSchoolHolidays) {
      badges.push(
        <Badge key="only-holiday" variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-600">
          <Sun className="h-3 w-3" />
          Only Holiday
        </Badge>
      )
    }
    if (chore.inactiveOnSchoolHolidays) {
      badges.push(
        <Badge key="inactive-holiday" variant="outline" className="flex items-center gap-1 border-slate-500 text-slate-600">
          <CalendarX className="h-3 w-3" />
          Inactive On Holiday
        </Badge>
      )
    }
    if (chore.specificDates && chore.specificDates.length > 0) {
      badges.push(
        <Badge key="specific-dates" variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-600">
          <CalendarCheck className="h-3 w-3" />
          Specific Dates ({chore.specificDates.length})
        </Badge>
      )
    }
    return badges
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {chore.emoji && <span className="text-2xl">{chore.emoji}</span>}
              <CardTitle className="text-lg font-fredoka">{chore.name}</CardTitle>
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
        <div className="space-y-3">
          {chore.categoryIds && chore.categoryIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chore.categoryIds.map((categoryId) => {
                const category = categories.find(c => c.id === categoryId)
                if (!category) return null
                return (
                  <Badge
                    key={categoryId}
                    variant="outline"
                    className="font-fredoka font-semibold px-3 py-1 border-2"
                    style={{
                      backgroundColor: `${category.color}20`,
                      borderColor: category.color,
                      color: category.color,
                    }}
                  >
                    {category.name}
                  </Badge>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {chore.categoryPoints && chore.categoryPoints.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {chore.categoryPoints.map((cp) => {
                    const category = categories.find(c => c.id === cp.categoryId)
                    if (!category) return null
                    return (
                      <Badge 
                        key={cp.categoryId}
                        className="font-fredoka"
                        style={{
                          backgroundColor: category.color,
                          color: 'white',
                        }}
                      >
                        {cp.points} {category.name} pts
                      </Badge>
                    )
                  })}
                </div>
              ) : (
                <Badge variant="secondary" className="font-fredoka text-base">
                  {chore.points} pts
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{chore.frequency}</span>
            </div>
            {chore.estimatedDuration && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>{formatDuration(chore.estimatedDuration)}</span>
              </div>
            )}
            {getTimeOfDayBadge()}
            {getTimeWindowBadge()}
            {getWeatherBadge()}
            {getCompletionTypeBadge()}
            {getHolidayBadges()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
