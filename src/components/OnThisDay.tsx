import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarCheck, Star, CaretLeft, CaretRight, Sparkle } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion, Category } from '@/lib/types'
import { CalendarEvent, getEventsForDate, getHistoricalDates } from '@/lib/icsHelper'

interface OnThisDayProps {
  child: Child
  chores: Chore[]
  completions: ChoreCompletion[]
  assignments: ChoreAssignment[]
  categories: Category[]
}

export function OnThisDay({
  child,
  chores,
  completions,
  assignments,
  categories,
}: OnThisDayProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [direction, setDirection] = useState(0)

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
    const allEvents: Array<CalendarEvent & { year: number }> = []
    
    historicalDates.forEach(date => {
      const dateEvents = getEventsForDate(date, child.id, completions, chores, assignments)
      dateEvents.forEach(event => {
        allEvents.push({
          ...event,
          year: date.getFullYear()
        })
      })
    })
    
    return allEvents.sort((a, b) => b.year - a.year)
  }, [historicalDates, child.id, completions, chores, assignments])

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

  if (events.length === 0) return null

  const currentEvent = events[currentEventIndex]
  const today = new Date()
  const yearsAgo = today.getFullYear() - currentEvent.year

  const categoryBadges = currentEvent.categoryColors?.map(catId => {
    const category = categories.find(c => c.id === catId)
    return category
  }).filter(Boolean) as Category[]

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
    <div className="mb-8">
      <h2 className="text-2xl font-fredoka font-bold mb-4 flex items-center gap-2">
        <Sparkle className="h-6 w-6 text-accent" weight="fill" />
        On This Day
      </h2>
      <Card className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-primary/5 to-secondary/5 border-2 border-accent/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {events.length > 1 && (
              <button
                onClick={handlePrevious}
                className="flex-shrink-0 p-2 rounded-full hover:bg-accent/10 transition-colors"
                aria-label="Previous event"
              >
                <CaretLeft className="h-6 w-6 text-accent" weight="bold" />
              </button>
            )}
            
            <div className="flex-1 min-w-0 relative" style={{ minHeight: '120px' }}>
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
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <CalendarCheck className="h-8 w-8 text-white" weight="bold" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="font-fredoka text-sm">
                          {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(currentEvent.date).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <h3 className="text-2xl font-fredoka font-bold mb-2 text-foreground">
                        {currentEvent.title}
                      </h3>
                      
                      {currentEvent.description && (
                        <p className="text-base text-muted-foreground mb-3">
                          {currentEvent.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {currentEvent.points !== undefined && (
                          <Badge className="font-fredoka bg-accent text-white">
                            <Star weight="fill" className="h-3 w-3 mr-1" />
                            {currentEvent.points} points earned
                          </Badge>
                        )}
                        
                        {categoryBadges.map(category => (
                          <Badge
                            key={category.id}
                            variant="outline"
                            className="font-fredoka font-semibold border-2"
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
                className="flex-shrink-0 p-2 rounded-full hover:bg-accent/10 transition-colors"
                aria-label="Next event"
              >
                <CaretRight className="h-6 w-6 text-accent" weight="bold" />
              </button>
            )}
          </div>
          
          {events.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {events.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentEventIndex ? 1 : -1)
                    setCurrentEventIndex(index)
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentEventIndex
                      ? 'bg-accent w-6'
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
