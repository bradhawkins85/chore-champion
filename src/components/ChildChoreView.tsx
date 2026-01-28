import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, Circle, Calendar, Star, ShoppingCart, SunHorizon, MoonStars, Warning, Users, Trophy, ArrowCounterClockwise, Clock } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion, CelebrationSettings, CelebrationAnimation, Reward, GoalTracker } from '@/lib/types'
import { isChoreCompleted, isChoreActive, isChoreAvailableNow, isChoreMissed, getCurrentTimeOfDay, isChoreCompletedForTimeOfDay, isChoreActiveToday, getChorePointsForChild, sortChoresByDesiredTime, getRandomCelebrationAnimation, getTimeWindowStatus, formatTime12Hour, getRewardCostForChild } from '@/lib/helpers'
import { ChoreCompletionCelebration } from './Celebration'
import { GoalProgress } from './GoalProgress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ChildChoreViewProps {
  child: Child
  chores: Chore[]
  assignments: ChoreAssignment[]
  completions: ChoreCompletion[]
  totalPoints: number
  celebrationSettings: CelebrationSettings
  onComplete: (choreId: string, timeOfDay?: 'am' | 'pm') => void
  onUndo: (choreId: string, timeOfDay?: 'am' | 'pm') => void
  onBack: () => void
  onShopClick: () => void
  trackedGoal?: GoalTracker | null
  rewards?: Reward[]
}

export function ChildChoreView({
  child,
  chores,
  assignments,
  completions,
  totalPoints,
  celebrationSettings,
  onComplete,
  onUndo,
  onBack,
  onShopClick,
  trackedGoal,
  rewards = [],
}: ChildChoreViewProps) {
  const [celebrating, setCelebrating] = useState<{ points: number; animation: CelebrationAnimation } | null>(null)

  const assignedChoreIds = new Set(
    assignments.filter((a) => a.childId === child.id).map((a) => a.choreId)
  )
  
  const childChores = chores.filter((c) => assignedChoreIds.has(c.id) && isChoreActive(c) && isChoreActiveToday(c))

  const currentTimeOfDay = getCurrentTimeOfDay()

  const { pendingChores, completedChores, missedChores, unavailableChores } = useMemo(() => {
    const pending: Array<{ chore: Chore; timeOfDay?: 'am' | 'pm' }> = []
    const completed: Array<{ chore: Chore; timeOfDay?: 'am' | 'pm' }> = []
    const missed: Array<{ chore: Chore; timeOfDay?: 'am' | 'pm' }> = []
    const unavailable: Array<{ chore: Chore; timeOfDay?: 'am' | 'pm'; windowStatus: ReturnType<typeof getTimeWindowStatus> }> = []

    childChores.forEach((chore) => {
      const windowStatus = getTimeWindowStatus(chore)
      
      if (chore.completionType === 'once-per-day') {
        const anyoneCompletedToday = completions.some((c) => {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return (
            c.choreId === chore.id &&
            c.completedAt >= today.getTime() &&
            (!chore.timeOfDay || chore.timeOfDay === 'anytime' || chore.timeOfDay === 'both' || c.timeOfDay === chore.timeOfDay)
          )
        })

        if (anyoneCompletedToday) {
          const completedByMe = completions.some((c) => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return (
              c.choreId === chore.id &&
              c.childId === child.id &&
              c.completedAt >= today.getTime()
            )
          })
          if (completedByMe) {
            completed.push({ chore })
          }
          return
        }
      }

      if (chore.timeOfDay === 'both') {
        const amCompleted = isChoreCompletedForTimeOfDay(completions, chore.id, child.id, 'am')
        const pmCompleted = isChoreCompletedForTimeOfDay(completions, chore.id, child.id, 'pm')
        
        if (currentTimeOfDay === 'am') {
          if (!amCompleted) {
            if (!windowStatus.isWithinWindow) {
              unavailable.push({ chore, timeOfDay: 'am', windowStatus })
            } else {
              pending.push({ chore, timeOfDay: 'am' })
            }
          } else {
            completed.push({ chore, timeOfDay: 'am' })
          }
        } else {
          if (!amCompleted) {
            missed.push({ chore, timeOfDay: 'am' })
          } else {
            completed.push({ chore, timeOfDay: 'am' })
          }
          
          if (!pmCompleted) {
            if (!windowStatus.isWithinWindow) {
              unavailable.push({ chore, timeOfDay: 'pm', windowStatus })
            } else {
              pending.push({ chore, timeOfDay: 'pm' })
            }
          } else {
            completed.push({ chore, timeOfDay: 'pm' })
          }
        }
      } else if (chore.timeOfDay === 'am' || chore.timeOfDay === 'pm') {
        const isCompleted = isChoreCompleted(completions, chore.id, child.id, chore.frequency, chore.timeOfDay)
        const isMissedChore = isChoreMissed(chore.timeOfDay, completions, chore.id, child.id)
        const isAvailable = isChoreAvailableNow(chore.timeOfDay)
        
        if (isMissedChore) {
          missed.push({ chore, timeOfDay: chore.timeOfDay })
        } else if (!isCompleted && isAvailable) {
          if (!windowStatus.isWithinWindow) {
            unavailable.push({ chore, timeOfDay: chore.timeOfDay, windowStatus })
          } else {
            pending.push({ chore, timeOfDay: chore.timeOfDay })
          }
        } else if (isCompleted) {
          completed.push({ chore, timeOfDay: chore.timeOfDay })
        }
      } else {
        const isCompleted = isChoreCompleted(completions, chore.id, child.id, chore.frequency, chore.timeOfDay)
        if (isCompleted) {
          completed.push({ chore })
        } else {
          if (!windowStatus.isWithinWindow) {
            unavailable.push({ chore, windowStatus })
          } else {
            pending.push({ chore })
          }
        }
      }
    })

    return { 
      pendingChores: sortChoresByDesiredTime(pending), 
      completedChores: completed, 
      missedChores: missed,
      unavailableChores: unavailable
    }
  }, [childChores, completions, child.id, currentTimeOfDay])

  const initials = child.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleComplete = (chore: Chore, timeOfDay?: 'am' | 'pm') => {
    if (celebrationSettings.enabled) {
      const animation = getRandomCelebrationAnimation(celebrationSettings)
      setCelebrating({ 
        points: getChorePointsForChild(chore, child.id),
        animation 
      })
    }
    onComplete(chore.id, timeOfDay)
  }

  const getTimeOfDayLabel = (timeOfDay?: 'am' | 'pm') => {
    if (!timeOfDay) return null
    return timeOfDay === 'am' ? (
      <Badge variant="outline" className="flex items-center gap-1">
        <SunHorizon className="h-3 w-3" />
        Morning
      </Badge>
    ) : (
      <Badge variant="outline" className="flex items-center gap-1">
        <MoonStars className="h-3 w-3" />
        Evening
      </Badge>
    )
  }

  const trackedReward = useMemo(() => {
    if (!trackedGoal || !rewards) return null
    return rewards.find(r => r.id === trackedGoal.rewardId)
  }, [trackedGoal, rewards])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16" style={{ backgroundColor: child.avatarColor }}>
              <AvatarFallback className="text-white font-fredoka text-2xl bg-transparent">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-fredoka font-bold">{child.name}'s Chores</h1>
              <div className="flex items-center gap-2 mt-1">
                <Star weight="fill" className="h-6 w-6 text-accent" />
                <span className="text-3xl font-fredoka text-accent">{totalPoints}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              size="lg"
              onClick={onShopClick} 
              className="text-lg px-6 py-6 font-fredoka"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Shop
            </Button>
            <Button variant="outline" onClick={onBack} className="text-lg px-6 py-6">
              Back
            </Button>
          </div>
        </div>

        {trackedReward && (
          <div className="mb-8">
            <GoalProgress
              reward={trackedReward}
              currentPoints={totalPoints}
              targetPoints={getRewardCostForChild(trackedReward, child.id)}
            />
          </div>
        )}

        {childChores.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-2xl font-fredoka text-muted-foreground">
                No chores assigned yet!
              </p>
              <p className="text-lg text-muted-foreground mt-2">
                Ask a parent to assign some chores.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {missedChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4 text-destructive flex items-center gap-2">
                  <Warning className="h-6 w-6" />
                  Missed Chores
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {missedChores.map(({ chore, timeOfDay }) => (
                    <Card key={`${chore.id}-${timeOfDay || 'missed'}`} className="border-destructive bg-destructive/10">
                      <CardContent className="p-3">
                        <div className="text-center space-y-1">
                          <h3 className="text-sm font-fredoka font-semibold text-foreground leading-tight">
                            {chore.name}
                          </h3>
                          <div className="text-xs font-medium text-destructive">
                            {timeOfDay === 'am' ? 'Morning' : 'Evening'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4">To Do</h2>
                <div className="grid gap-4">
                  {pendingChores.map(({ chore, timeOfDay }, index) => (
                    <motion.div
                      key={`${chore.id}-${timeOfDay || 'anytime'}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:scale-102 transition-all hover:shadow-xl"
                        onClick={() => handleComplete(chore, timeOfDay)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Circle className="h-12 w-12 text-muted-foreground flex-shrink-0" />
                            </motion.div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-fredoka font-bold">
                                  {chore.name}
                                </h3>
                                {getTimeOfDayLabel(timeOfDay)}
                                {chore.completionType === 'shareable' && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Shareable
                                  </Badge>
                                )}
                                {chore.completionType === 'once-per-day' && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    First Only
                                  </Badge>
                                )}
                              </div>
                              {chore.description && (
                                <p className="text-lg text-muted-foreground mt-1">
                                  {chore.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-3">
                                <Badge
                                  variant="secondary"
                                  className="font-fredoka text-lg px-3 py-1"
                                >
                                  <Star weight="fill" className="h-4 w-4 mr-1" />
                                  {chore.completionType === 'shareable' 
                                    ? `Up to ${getChorePointsForChild(chore, child.id)} pts (shared)`
                                    : `${getChorePointsForChild(chore, child.id)} pts`}
                                </Badge>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-5 w-5" />
                                  <span className="capitalize text-base">{chore.frequency}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {completedChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4 text-muted-foreground">
                  Completed ✓
                </h2>
                <div className="grid gap-4">
                  {completedChores.map(({ chore, timeOfDay }) => (
                    <Card key={`${chore.id}-${timeOfDay || 'completed'}`} className="opacity-60">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <CheckCircle
                            weight="fill"
                            className="h-12 w-12 text-primary flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-2xl font-fredoka font-bold line-through">
                                {chore.name}
                              </h3>
                              {getTimeOfDayLabel(timeOfDay)}
                            </div>
                            <Badge
                              variant="secondary"
                              className="font-fredoka text-lg px-3 py-1 mt-2"
                            >
                              <Star weight="fill" className="h-4 w-4 mr-1" />
                              {getChorePointsForChild(chore, child.id)} pts
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUndo(chore.id, timeOfDay)
                            }}
                            className="flex-shrink-0"
                          >
                            <ArrowCounterClockwise className="h-5 w-5 mr-2" />
                            Undo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {unavailableChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4 text-muted-foreground flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Not Available Right Now
                </h2>
                <div className="grid gap-4">
                  {unavailableChores.map(({ chore, timeOfDay, windowStatus }) => (
                    <Card key={`${chore.id}-${timeOfDay || 'unavailable'}`} className="opacity-50">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Clock className="h-12 w-12 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-2xl font-fredoka font-bold">
                                {chore.name}
                              </h3>
                              {getTimeOfDayLabel(timeOfDay)}
                            </div>
                            {chore.description && (
                              <p className="text-lg text-muted-foreground mb-2">
                                {chore.description}
                              </p>
                            )}
                            {windowStatus.startTime && windowStatus.endTime && (
                              <Alert className="mt-2">
                                <Clock className="h-4 w-4" />
                                <AlertDescription>
                                  {windowStatus.isBefore && (
                                    <>Available from <strong>{formatTime12Hour(windowStatus.startTime)}</strong> to <strong>{formatTime12Hour(windowStatus.endTime)}</strong></>
                                  )}
                                  {windowStatus.isAfter && (
                                    <>This chore was available until <strong>{formatTime12Hour(windowStatus.endTime)}</strong></>
                                  )}
                                </AlertDescription>
                              </Alert>
                            )}
                            <div className="flex items-center gap-3 mt-3">
                              <Badge
                                variant="secondary"
                                className="font-fredoka text-lg px-3 py-1"
                              >
                                <Star weight="fill" className="h-4 w-4 mr-1" />
                                {getChorePointsForChild(chore, child.id)} pts
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingChores.length === 0 && completedChores.length > 0 && unavailableChores.length === 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-4xl font-fredoka font-bold text-primary">
                  All done! Great job! 🎉
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {celebrating !== null && (
          <ChoreCompletionCelebration
            points={celebrating.points}
            animationType={celebrating.animation}
            onComplete={() => setCelebrating(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
