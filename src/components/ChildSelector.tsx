import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gear, Trophy, Clock, SpeakerHigh, Fingerprint } from '@phosphor-icons/react'
import { Child, GoalTracker, Reward, Category, ChoreAssignment, Chore, ChoreCompletion, WeatherSettings, SpeechSettings, BiometricSettings, SchoolHoliday, SchoolHolidayCountdownSettings, ChildAvailabilityEntry } from '@/lib/types'
import { getRewardCostForChild, getNextUpcomingChore, formatTime12Hour, formatDuration, getInitialsFromName, hasChildActivity } from '@/lib/helpers'
import { WeatherDisplay } from '@/components/WeatherDisplay'
import { SchoolHolidayCountdownCard } from '@/components/SchoolHolidayCountdownCard'
import { isStandalone } from '@/lib/pwaHelper'
import { fetchICSFeed, getICSEventsForToday } from '@/lib/icsHelper'

interface ChildSelectorProps {
  childrenList: Child[]
  childPoints: Map<string, number>
  pendingPurchasesCount: number
  onSelect: (child: Child) => void
  onParentMode: () => void
  trackedGoals?: GoalTracker[]
  rewards?: Reward[]
  categoryPoints?: Map<string, Map<string, number>>
  categories?: Category[]
  assignments?: ChoreAssignment[]
  chores?: Chore[]
  completions?: ChoreCompletion[]
  childAvailability?: ChildAvailabilityEntry[]
  weatherSettings?: WeatherSettings
  speechSettings?: SpeechSettings
  biometricSettings?: BiometricSettings
  hideChildrenWithNoActivity?: boolean
  schoolHolidays?: SchoolHoliday[]
  schoolHolidayCountdownSettings?: SchoolHolidayCountdownSettings
}

export function ChildSelector({ 
  childrenList, 
  childPoints, 
  pendingPurchasesCount, 
  onSelect, 
  onParentMode,
  trackedGoals = [],
  rewards = [],
  categoryPoints,
  categories = [],
  assignments = [],
  chores = [],
  completions = [],
  childAvailability = [],
  weatherSettings,
  speechSettings,
  biometricSettings,
  hideChildrenWithNoActivity = false,
  schoolHolidays = [],
  schoolHolidayCountdownSettings,
}: ChildSelectorProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null)
  const [showBiometricBadge, setShowBiometricBadge] = useState(false)
  const [childICSEventsMap, setChildICSEventsMap] = useState<Map<string, boolean>>(new Map())

  // Create a stable key based on child IDs and ICS URLs to avoid unnecessary refetches
  const childICSKey = useMemo(
    () => childrenList.map(c => `${c.id}:${c.icsUrl || ''}`).join('|'),
    [childrenList]
  )

  // Load ICS events for all children to determine if they have calendar events
  useEffect(() => {
    if (!hideChildrenWithNoActivity) {
      // Clear the map when the setting is disabled to avoid stale data
      setChildICSEventsMap(new Map())
      return
    }

    const loadAllICSFeeds = async () => {
      const eventsMap = new Map<string, boolean>()
      
      // Fetch all ICS feeds concurrently using Promise.all for better performance
      const fetchPromises = childrenList.map(async (child) => {
        if (child.icsUrl) {
          try {
            const events = await fetchICSFeed(child.icsUrl)
            const todayEvents = getICSEventsForToday(events)
            return { childId: child.id, hasEvents: todayEvents.length > 0 }
          } catch (error) {
            return { childId: child.id, hasEvents: false }
          }
        }
        return { childId: child.id, hasEvents: false }
      })
      
      const results = await Promise.all(fetchPromises)
      results.forEach(({ childId, hasEvents }) => {
        eventsMap.set(childId, hasEvents)
      })
      
      setChildICSEventsMap(eventsMap)
    }

    loadAllICSFeeds()
    // Note: childrenList is accessed in the effect but not in the dependency array
    // because childICSKey already tracks changes to child IDs and ICS URLs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childICSKey, hideChildrenWithNoActivity])

  // Filter children based on activity if the setting is enabled
  const filteredChildrenList = useMemo(() => {
    if (!hideChildrenWithNoActivity) {
      return childrenList
    }

    const choresMap = new Map(chores.map(c => [c.id, c]))
    
    return childrenList.filter(child => {
      const hasICSEvents = childICSEventsMap.get(child.id) || false
      return hasChildActivity(child.id, assignments, choresMap, completions, hasICSEvents, childAvailability)
    })
  }, [childrenList, hideChildrenWithNoActivity, assignments, chores, completions, childICSEventsMap, childAvailability])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const isPWA = isStandalone()
    const hasBiometric = biometricSettings?.enabled && 
                         biometricSettings?.quickUnlockOnPWA && 
                         (biometricSettings?.credentials?.length ?? 0) > 0
    setShowBiometricBadge(Boolean(isPWA && hasBiometric))
  }, [biometricSettings])

  const handleSpeak = (choreId: string, choreName: string, choreDescription: string, speakDescription: boolean = true) => {
    if (!speechSettings?.enabled) return
    
    setIsSpeaking(choreId)
    
    const utterance = new SpeechSynthesisUtterance()
    utterance.text = speakDescription && choreDescription 
      ? `${choreName}. ${choreDescription}` 
      : choreName
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsSpeaking(null)
    }
    
    utterance.onerror = () => {
      setIsSpeaking(null)
    }
    
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
    return date.toLocaleDateString('en-US', options)
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-fredoka font-bold text-center mb-4 text-foreground"
        >
          Who's ready for chores?
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-lg font-inter text-muted-foreground mb-4"
        >
          {formatDateTime(currentDateTime)}
        </motion.p>

        {(weatherSettings || schoolHolidayCountdownSettings?.enabled) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 flex flex-col items-center justify-center gap-4 md:flex-row md:items-stretch"
          >
            {weatherSettings && (
              <div className="flex w-full max-w-md">
                <WeatherDisplay settings={weatherSettings} />
              </div>
            )}
            {schoolHolidayCountdownSettings && (
              <div className="flex w-full max-w-md">
                <SchoolHolidayCountdownCard
                  holidays={schoolHolidays}
                  settings={schoolHolidayCountdownSettings}
                />
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildrenList.map((child, index) => {
            const initials = getInitialsFromName(child.name)

            const childGoal = trackedGoals.find(g => g.childId === child.id)
            const goalReward = childGoal ? rewards.find(r => r.id === childGoal.rewardId) : null
            const currentPoints = childPoints.get(child.id) || 0
            const targetPoints = goalReward ? getRewardCostForChild(goalReward, child.id) : 0
            const progress = goalReward ? Math.min((currentPoints / targetPoints) * 100, 100) : 0
            const childCategoryPoints = categoryPoints?.get(child.id)
            
            const choresMap = new Map(chores.map(c => [c.id, c]))
            const categoriesMap = new Map(categories.map((category) => [category.id, category]))
            const nextChore = getNextUpcomingChore(child.id, assignments, choresMap, completions, categoriesMap, childAvailability)

            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:scale-105 transition-all hover:shadow-2xl"
                  onClick={() => onSelect(child)}
                >
                  <CardContent className="p-8 text-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Avatar
                        className="h-24 w-24 mx-auto mb-4"
                        style={{ backgroundColor: child.avatarColor }}
                      >
                        <AvatarFallback className="text-white font-fredoka text-3xl bg-transparent">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <h2 className="text-3xl font-fredoka font-bold mb-2">
                      {child.name}
                    </h2>
                    <p className="text-2xl font-fredoka text-accent mb-3">
                      {currentPoints} ⭐
                    </p>
                    
                    {childCategoryPoints && categories.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mb-3">
                        {categories.map((category) => {
                          const points = childCategoryPoints.get(category.id) || 0
                          return (
                            <Badge
                              key={category.id}
                              variant="outline"
                              className="font-fredoka text-sm"
                              style={{ borderColor: category.color, color: category.color }}
                            >
                              {category.name}: {points}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    
                    {nextChore && (
                      <div className="mt-4 pt-4 border-t space-y-1">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" weight="fill" />
                          <span>Next Up:</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-base font-fredoka font-semibold text-foreground">
                            {nextChore.chore.name}
                          </p>
                          {speechSettings?.enabled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSpeak(
                                  nextChore.chore.id,
                                  nextChore.chore.name,
                                  nextChore.chore.description,
                                  nextChore.chore.speakDescription ?? true
                                )
                              }}
                              disabled={isSpeaking === nextChore.chore.id}
                            >
                              <SpeakerHigh 
                                className="h-4 w-4" 
                                weight={isSpeaking === nextChore.chore.id ? "fill" : "regular"}
                              />
                            </Button>
                          )}
                        </div>
                        {(nextChore.timeOfDay || nextChore.assignment.timeWindow || nextChore.chore.timeWindow || nextChore.chore.estimatedDuration) && (
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            {nextChore.timeOfDay && (
                              <Badge variant="secondary" className="text-xs">
                                {nextChore.timeOfDay.toUpperCase()}
                              </Badge>
                            )}
                            {(nextChore.assignment.timeWindow || nextChore.chore.timeWindow) && (
                              <span>
                                {formatTime12Hour((nextChore.assignment.timeWindow || nextChore.chore.timeWindow)!.startTime)}
                              </span>
                            )}
                            {nextChore.chore.estimatedDuration && (
                              <span>• {formatDuration(nextChore.chore.estimatedDuration)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {goalReward && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                          <Trophy className="h-4 w-4" weight="fill" />
                          <span>Goal: {goalReward.name}</span>
                        </div>
                        <div className="space-y-1">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {currentPoints} / {targetPoints} points
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: filteredChildrenList.length * 0.1 }}
          >
            <Card
              className="cursor-pointer hover:scale-105 transition-all hover:shadow-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5"
              onClick={onParentMode}
            >
              <CardContent className="p-8 text-center relative">
                {pendingPurchasesCount > 0 && (
                  <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                    {pendingPurchasesCount}
                  </div>
                )}
                {showBiometricBadge && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Fingerprint className="h-3 w-3" weight="fill" />
                      Quick Unlock
                    </Badge>
                  </div>
                )}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="h-24 w-24 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                    <Gear className="h-12 w-12 text-primary-foreground" weight="fill" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-fredoka font-bold mb-2">
                  Parent Mode
                </h2>
                <p className="text-lg font-fredoka text-muted-foreground">
                  {showBiometricBadge ? 'Tap to use Quick Unlock' : 'Manage & Configure'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
