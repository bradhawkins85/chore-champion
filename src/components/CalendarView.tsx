import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar as CalendarIcon, Clock } from '@phosphor-icons/react'
import { Child } from '@/lib/types'
import { fetchICSFeed, ICSEvent } from '@/lib/icsHelper'
import { format, startOfDay, addDays, isSameDay } from 'date-fns'

interface CalendarViewProps {
  child: Child
  onBack: () => void
}

export function CalendarView({ child, onBack }: CalendarViewProps) {
  const [events, setEvents] = useState<ICSEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      if (!child.icsUrl) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const parsedEvents = await fetchICSFeed(child.icsUrl)
        setEvents(parsedEvents)
      } catch (err) {
        setError('Failed to load calendar events')
        console.error('Error fetching calendar:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [child.icsUrl])

  const next7Days = useMemo(() => {
    const days: Date[] = []
    const today = startOfDay(new Date())
    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i))
    }
    return days
  }, [])

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, ICSEvent[]>()
    
    next7Days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped.set(dayKey, [])
    })

    events.forEach(event => {
      const eventDate = new Date(event.dtstart)
      next7Days.forEach(day => {
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
  }, [events, next7Days])

  const showTimes = child.calendarShowTimes !== false

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-fredoka font-bold">Calendar</h1>
            <p className="text-muted-foreground">Next 7 days for {child.name}</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading calendar events...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : !child.icsUrl ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground mb-2">No calendar connected</p>
              <p className="text-sm text-muted-foreground">
                Ask your parents to add a calendar feed in your settings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {next7Days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDay.get(dayKey) || []
              const isToday = isSameDay(day, new Date())

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
                    {dayEvents.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No events</p>
                    ) : (
                      <div className="space-y-3">
                        {dayEvents.map((event, index) => (
                          <div
                            key={`${event.uid}-${index}`}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
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
