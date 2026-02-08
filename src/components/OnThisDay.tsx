import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Star, CaretLeft, CaretRight, Sparkle, MapPin, Clock, ArrowClockwise } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion, Category } from '@/lib/types'
import { CalendarEvent, getEventsForDate, getHistoricalDates, fetchICSFeed, getICSEventsForToday } from '@/lib/icsHelper'
import { toast } from 'sonner'

interface OnThisDayProps {
  child: Child
  chores: Chore[]
  completions: ChoreCompletion[]
  assignments: ChoreAssignment[]
  categories: Category[]
  onUpdateLastRefresh?: (timestamp: number) => void
}

export function OnThisDay({
  child,
  chores,
  completions,
  assignments,
  categories,
  onUpdateLastRefresh,
}: OnThisDayProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [icsEvents, setIcsEvents] = useState<CalendarEvent[]>([])
  const [isLoadingICS, setIsLoadingICS] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(
    child.calendarLastRefresh || null
  )

  const loadICSFeed = async (showToast = false) => {
    if (!child.icsUrl) {
      setIcsEvents([])
      return
    }

    setIsLoadingICS(true)
    setIsRefreshing(true)
    try {
      const events = await fetchICSFeed(child.icsUrl!)
      const todayEvents = getICSEventsForToday(events)
      setIcsEvents(todayEvents)
      const now = Date.now()
      setLastRefreshTime(now)
      onUpdateLastRefresh?.(now)
      if (showToast) {
        toast.success('Calendar feed refreshed!', {
          description: `Found ${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} for today`,
        })
      }
    } catch (error) {
      console.error('Failed to load ICS feed:', error)
      setIcsEvents([])
      if (showToast) {
        toast.error('Failed to refresh calendar feed', {
          description: 'Please check the feed URL and try again',
        })
      }
    } finally {
      setIsLoadingICS(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadICSFeed(false)
  }, [child.icsUrl])

  useEffect(() => {
    if (!child.calendarAutoRefresh || !child.icsUrl) {
      return
    }

    const getIntervalMs = () => {
      switch (child.calendarRefreshInterval) {
        case '5min':
          return 5 * 60 * 1000
        case '15min':
          return 15 * 60 * 1000
        case '30min':
          return 30 * 60 * 1000
        case '1hour':
          return 60 * 60 * 1000
        case '6hours':
          return 6 * 60 * 60 * 1000
        case '12hours':
          return 12 * 60 * 60 * 1000
        case '24hours':
          return 24 * 60 * 60 * 1000
        default:
          return 15 * 60 * 1000
      }
    }

    const intervalMs = getIntervalMs()
    const interval = setInterval(() => {
      loadICSFeed(false)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [child.calendarAutoRefresh, child.calendarRefreshInterval, child.icsUrl])

  const historicalDates = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentDay = today.getDate()
    
    return getHistoricalDates(completions, child.id).filter(date => {
      const eventMonth = date.getMonth()
      const eventDay = date.getDate()
      const eventYear = date.getFullYear()
      const currentYear = today.getFullYear()
      
      return eventMonth === currentMonth && 
             eventDay === currentDay && 
             eventYear < currentYear
    })
  }, [completions, child.id])

  const events = useMemo(() => {
    const allEvents: Array<CalendarEvent & { year?: number }> = []
    
    historicalDates.forEach(date => {
      const dateEvents = getEventsForDate(date, child.id, completions, chores, assignments)
      dateEvents.forEach(event => {
        allEvents.push({
          ...event,
          year: date.getFullYear()
        })
      })
    })
    
    icsEvents.forEach(event => {
      allEvents.push({
        ...event,
        year: undefined
      })
    })
    
    return allEvents.sort((a, b) => {
      const aYear = a.year ?? 0
      const bYear = b.year ?? 0
      if (aYear && bYear) return bYear - aYear
      if (aYear) return 1
      if (bYear) return -1
      return 0
    })
  }, [historicalDates, child.id, completions, chores, assignments, icsEvents])

  useEffect(() => {
    if (events.length <= 1) return

    const interval = setInterval(() => {
      setDirection(1)
      setCurrentEventIndex((prev) => (prev + 1) % events.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [events.length])

  const handlePrevious = () => {
    setDirection(-1)
    setCurrentEventIndex((prev) => (prev - 1 + events.length) % events.length)
  }

  const handleNext = () => {
    setDirection(1)
    setCurrentEventIndex((prev) => (prev + 1) % events.length)
  }

  const handleRefresh = async () => {
    await loadICSFeed(true)
  }

  const formatLastRefreshTime = () => {
    if (!lastRefreshTime) return null
    
    const now = Date.now()
    const diffMinutes = Math.floor((now - lastRefreshTime) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes === 1) return '1 minute ago'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  // If no ICS URL is configured and no events, don't render anything
  if (!child.icsUrl && events.length === 0 && !isLoadingICS) return null

  if (isLoadingICS && !isRefreshing) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-fredoka font-bold mb-3 flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-accent" weight="fill" />
          On This Day
        </h2>
        <Card className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-primary/5 to-secondary/5 border-2 border-accent/20">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              Loading calendar events...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If ICS URL is configured but no events, show a message with refresh option
  if (child.icsUrl && events.length === 0 && !isLoadingICS) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-fredoka font-bold flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-accent" weight="fill" />
            On This Day
          </h2>
          <div className="flex items-center gap-2">
            {lastRefreshTime && (
              <span className="text-xs text-muted-foreground">
                Updated {formatLastRefreshTime()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1 h-7 px-2 text-xs"
            >
              <ArrowClockwise 
                className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} 
                weight="bold" 
              />
              Refresh
            </Button>
          </div>
        </div>
        <Card className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-primary/5 to-secondary/5 border-2 border-accent/20">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              No events found for today
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentEvent = events[currentEventIndex]
  
  // If we have no events at all (and no ICS URL), don't render
  if (!currentEvent && !child.icsUrl) return null
  
  const today = new Date()
  const yearsAgo = currentEvent.year ? today.getFullYear() - currentEvent.year : undefined

  const categoryBadges = (currentEvent.categoryColors || []).map(catId => {
    const category = categories.find(c => c.id === catId)
    return category
  }).filter(Boolean) as Category[]

  const formatEventTime = (date: Date, endDate?: Date) => {
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    if (endDate) {
      const endTimeStr = endDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
      return `${timeStr} - ${endTimeStr}`
    }
    
    return timeStr
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-fredoka font-bold flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-accent" weight="fill" />
          On This Day
        </h2>
        {child.icsUrl && (
          <div className="flex items-center gap-2">
            {lastRefreshTime && (
              <span className="text-xs text-muted-foreground">
                Updated {formatLastRefreshTime()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1 h-7 px-2 text-xs"
            >
              <ArrowClockwise 
                className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} 
                weight="bold" 
              />
              Refresh
            </Button>
          </div>
        )}
      </div>
      <Card className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-primary/5 to-secondary/5 border-2 border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {events.length > 1 && (
              <button
                onClick={handlePrevious}
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-accent/10 transition-colors"
                aria-label="Previous event"
              >
                <CaretLeft className="h-5 w-5 text-accent" weight="bold" />
              </button>
            )}
            
            <div className="flex-1 min-w-0 relative" style={{ minHeight: '80px' }}>
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentEventIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="absolute inset-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <CalendarCheck className="h-6 w-6 text-white" weight="bold" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {yearsAgo !== undefined ? (
                          <>
                            <Badge variant="secondary" className="font-fredoka text-xs h-5">
                              {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(currentEvent.date).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </>
                        ) : (
                          <Badge variant="secondary" className="font-fredoka text-xs h-5">
                            Today
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-fredoka font-bold mb-1 text-foreground">
                        {currentEvent.title}
                      </h3>
                      
                      {currentEvent.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {currentEvent.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        {currentEvent.type === 'calendar' && (
                          <>
                            <Badge variant="outline" className="font-fredoka text-xs h-5">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatEventTime(currentEvent.date, currentEvent.endDate)}
                            </Badge>
                            {currentEvent.location && (
                              <Badge variant="outline" className="font-fredoka text-xs h-5">
                                <MapPin className="h-3 w-3 mr-1" />
                                {currentEvent.location}
                              </Badge>
                            )}
                          </>
                        )}
                        
                        {currentEvent.points !== undefined && (
                          <Badge className="font-fredoka bg-accent text-white text-xs h-5">
                            <Star weight="fill" className="h-3 w-3 mr-1" />
                            {currentEvent.points} points earned
                          </Badge>
                        )}
                        
                        {categoryBadges.map(category => (
                          <Badge
                            key={category.id}
                            variant="outline"
                            className="font-fredoka font-semibold border text-xs h-5"
                            style={{
                              backgroundColor: `${category.color}20`,
                              borderColor: category.color,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {events.length > 1 && (
              <button
                onClick={handleNext}
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-accent/10 transition-colors"
                aria-label="Next event"
              >
                <CaretRight className="h-5 w-5 text-accent" weight="bold" />
              </button>
            )}
          </div>
          
          {events.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {events.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentEventIndex ? 1 : -1)
                    setCurrentEventIndex(index)
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentEventIndex
                      ? 'bg-accent w-4'
                      : 'bg-accent/30 hover:bg-accent/50'
                  }`}
                  aria-label={`Go to event ${index + 1}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
