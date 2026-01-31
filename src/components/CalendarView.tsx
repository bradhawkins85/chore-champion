import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar as CalendarIcon, Clock, ArrowClockwise, CheckCircle, Circle, CalendarDots, WarningCircle } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion, Category } from '@/lib/types'
import { fetchICSFeed, ICSEvent } from '@/lib/icsHelper'
import { format, startOfDay, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns'
import { toast } from 'sonner'
import { isChoreActiveForDate, isChoreActiveOnDate, isChoreCompletedOnDate, getChorePointsForChild, getChoreCategoryPointsForChild } from '@/lib/helpers'

interface CalendarViewProps {
  child: Child
  chores?: Chore[]
  assignments?: ChoreAssignment[]
  completions?: ChoreCompletion[]
  categories?: Category[]
  onBack: () => void
}

export function CalendarView({ child, chores = [], assignments = [], completions = [], categories = [], onBack }: CalendarViewProps) {
  const [events, setEvents] = useState<ICSEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  const fetchEvents = async () => {
    if (!child.icsUrl) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('Fetching ICS feed from:', child.icsUrl)
      const parsedEvents = await fetchICSFeed(child.icsUrl)
      console.log('Successfully loaded events:', parsedEvents.length)
      setEvents(parsedEvents)
      if (parsedEvents.length > 0) {
        toast.success(`Loaded ${parsedEvents.length} calendar events`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar events'
      setError(errorMessage)
      console.error('Error fetching calendar:', err)
      toast.error('Failed to load calendar', {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [child.icsUrl, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Filter assignments for this child
  const childAssignments = useMemo(() => {
    return assignments.filter(a => a.childId === child.id)
  }, [assignments, child.id])

  // Create a map of chores for quick lookup
  const choresMap = useMemo(() => {
    const map = new Map<string, Chore>()
    chores.forEach(chore => map.set(chore.id, chore))
    return map
  }, [chores])

  // Get days to display based on view mode
  const daysToDisplay = useMemo(() => {
    const days: Date[] = []
    const today = startOfDay(new Date())
    
    if (viewMode === 'week') {
      for (let i = 0; i < 7; i++) {
        days.push(addDays(today, i))
      }
    } else {
      // Monthly view - show current month
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      return eachDayOfInterval({ start: monthStart, end: monthEnd })
    }
    
    return days
  }, [viewMode])

  // Get chores scheduled for a specific date
  const getChoresForDate = (date: Date) => {
    const dateChores: Array<{
      chore: Chore
      assignment: ChoreAssignment
      completed: boolean
      timeOfDay?: 'am' | 'pm'
      points: number
    }> = []

    childAssignments.forEach(assignment => {
      const chore = choresMap.get(assignment.choreId)
      if (!chore) return

      // Check if assignment is active for this date
      if (!isChoreActiveForDate(assignment, date)) return
      
      // Check if chore is scheduled for this date
      if (!isChoreActiveOnDate(assignment, date)) return

      const effectiveTimeOfDay = assignment.timeOfDay || chore.timeOfDay || 'anytime'
      const points = getChorePointsForChild(chore, assignment, child.id)

      // Handle different time of day scenarios
      if (effectiveTimeOfDay === 'both') {
        // Check AM completion
        const amCompleted = isChoreCompletedOnDate(completions, chore.id, child.id, date, 'am')
        dateChores.push({
          chore,
          assignment,
          completed: amCompleted,
          timeOfDay: 'am',
          points
        })
        
        // Check PM completion
        const pmCompleted = isChoreCompletedOnDate(completions, chore.id, child.id, date, 'pm')
        dateChores.push({
          chore,
          assignment,
          completed: pmCompleted,
          timeOfDay: 'pm',
          points
        })
      } else {
        const timeOfDayFilter = (effectiveTimeOfDay === 'am' || effectiveTimeOfDay === 'pm') ? effectiveTimeOfDay : undefined
        const completed = isChoreCompletedOnDate(completions, chore.id, child.id, date, timeOfDayFilter)
        
        dateChores.push({
          chore,
          assignment,
          completed,
          timeOfDay: timeOfDayFilter,
          points
        })
      }
    })

    return dateChores
  }

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, ICSEvent[]>()
    
    daysToDisplay.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped.set(dayKey, [])
    })

    events.forEach(event => {
      const eventDate = new Date(event.dtstart)
      daysToDisplay.forEach(day => {
        if (isSameDay(eventDate, day)) {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayEvents = grouped.get(dayKey) || []
          dayEvents.push(event)
          grouped.set(dayKey, dayEvents)
        }
      })
    })

    grouped.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        const timeA = new Date(a.dtstart).getTime()
        const timeB = new Date(b.dtstart).getTime()
        return timeA - timeB
      })
    })

    return grouped
  }, [events, daysToDisplay])

  const showTimes = child.calendarShowTimes !== false

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-fredoka font-bold">Calendar</h1>
              <p className="text-muted-foreground">
                {viewMode === 'week' ? 'Next 7 days' : 'This month'} for {child.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="rounded-none"
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="rounded-none"
              >
                Month
              </Button>
            </div>
            {child.icsUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={loading}
              >
                <ArrowClockwise className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {loading && child.icsUrl ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading calendar events...</p>
            </CardContent>
          </Card>
        ) : error && child.icsUrl ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center mb-4">
                <p className="text-destructive font-medium mb-2">Failed to load calendar events</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                {child.icsUrl && (
                  <div className="text-xs text-muted-foreground mb-4 p-3 bg-muted rounded-md break-all">
                    <strong>Calendar URL:</strong><br />
                    {child.icsUrl}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} disabled={loading}>
                  <ArrowClockwise className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {daysToDisplay.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDay.get(dayKey) || []
              const dayChores = getChoresForDate(day)
              const isToday = isSameDay(day, new Date())
              const hasContent = dayEvents.length > 0 || dayChores.length > 0

              // For monthly view, show simpler cards
              if (viewMode === 'month') {
                return (
                  <Card 
                    key={dayKey} 
                    className={`${isToday ? 'border-primary' : ''} ${!hasContent ? 'opacity-60' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {format(day, 'EEE, MMM d')}
                          {isToday && (
                            <span className="text-sm font-normal text-primary">(Today)</span>
                          )}
                        </div>
                        <div className="flex gap-2 text-sm font-normal text-muted-foreground">
                          {dayChores.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {dayChores.filter(c => !c.completed).length}/{dayChores.length} chores
                            </Badge>
                          )}
                          {dayEvents.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {dayEvents.length} events
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )
              }

              // Weekly view - show full details
              return (
                <Card key={dayKey} className={isToday ? 'border-primary' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      {format(day, 'EEEE, MMMM d')}
                      {isToday && (
                        <span className="text-sm font-normal text-primary">(Today)</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!hasContent ? (
                      <p className="text-muted-foreground text-sm">No chores or events</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Display Chores */}
                        {dayChores.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-sm">Chores</h4>
                            </div>
                            <div className="space-y-2">
                              {dayChores.map((choreItem, index) => (
                                <div
                                  key={`${choreItem.chore.id}-${choreItem.timeOfDay || 'any'}-${index}`}
                                  className={`flex items-start gap-3 p-3 rounded-lg ${
                                    choreItem.completed 
                                      ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900' 
                                      : 'bg-muted/50'
                                  }`}
                                >
                                  <div className="flex-shrink-0 mt-1">
                                    {choreItem.completed ? (
                                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" weight="fill" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className={`font-medium ${choreItem.completed ? 'line-through text-muted-foreground' : ''}`}>
                                          {choreItem.chore.name}
                                        </p>
                                        {choreItem.chore.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {choreItem.chore.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          {choreItem.timeOfDay && (
                                            <Badge variant="outline" className="text-xs">
                                              {choreItem.timeOfDay.toUpperCase()}
                                            </Badge>
                                          )}
                                          <Badge variant="secondary" className="text-xs">
                                            {choreItem.points} pts
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Display ICS Events */}
                        {dayEvents.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <CalendarDots className="h-4 w-4 text-blue-600" />
                              <h4 className="font-semibold text-sm">Events</h4>
                            </div>
                            <div className="space-y-2">
                              {dayEvents.map((event, index) => (
                                <div
                                  key={`${event.uid}-${index}`}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                                >
                                  {showTimes && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[80px]">
                                      <Clock className="h-4 w-4" />
                                      {format(new Date(event.dtstart), 'h:mm a')}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium">{event.summary}</p>
                                    {event.location && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        📍 {event.location}
                                      </p>
                                    )}
                                    {event.description && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {event.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
