import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, Circle, Calendar, Star, ShoppingCart, SunHorizon, MoonStars, Warning, Users, Trophy, ArrowCounterClockwise, Clock, Timer, ClockClockwise, ChartLine, Lock } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion, CelebrationSettings, CelebrationAnimation, Reward, GoalTracker, Category, WeatherData } from '@/lib/types'
import { isChoreCompleted, isChoreActive, isChoreAvailableNow, isChoreMissed, getCurrentTimeOfDay, isChoreCompletedForTimeOfDay, isChoreActiveToday, getChorePointsForChild, getChoreCategoryPointsForChild, sortChoresByDesiredTime, getRandomCelebrationAnimation, getTimeWindowStatus, formatTime12Hour, getRewardCostForChild, formatDuration, getCategoryCompletionProgress, getShareableChoreCompletionCount, isShareableChoreFullyCompleted, hasChildCompletedShareableChore, getInitialsFromName, isPrerequisiteCategoryCompleted } from '@/lib/helpers'
import { shouldShowChore } from '@/lib/weatherChoreHelper'
import { ChoreCompletionCelebration } from './Celebration'
import { GoalProgress } from './GoalProgress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OnThisDay } from './OnThisDay'

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
  onHistoryClick?: () => void
  onCalendarClick?: () => void
  trackedGoal?: GoalTracker | null
  rewards?: Reward[]
  categories?: Category[]
  categoryPoints?: Map<string, number>
  availableCategoryPoints?: Map<string, number>
  onSwapPoints?: (fromCategoryId: string, toCategoryId: string, fromAmount: number, toAmount: number) => void
  onUpdateCalendarRefresh?: (timestamp: number) => void
  currentWeather?: WeatherData | null
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
  onHistoryClick,
  onCalendarClick,
  trackedGoal,
  rewards = [],
  categories = [],
  categoryPoints,
  availableCategoryPoints,
  onSwapPoints,
  onUpdateCalendarRefresh,
  currentWeather,
}: ChildChoreViewProps) {
  const [celebrating, setCelebrating] = useState<{ points: number; animation: CelebrationAnimation } | null>(null)

  const assignedChoreIds = new Set(
    assignments.filter((a) => a.childId === child.id).map((a) => a.choreId)
  )
  
  const childAssignments = assignments.filter((a) => a.childId === child.id && isChoreActive(a) && isChoreActiveToday(a))
  const childChores = chores
    .filter((c) => childAssignments.some((a) => a.choreId === c.id))
    .filter((c) => shouldShowChore(c, currentWeather || null))

  const currentTimeOfDay = getCurrentTimeOfDay()

  const pendingApprovalCompletions = useMemo(() => {
    return completions.filter((c) => 
      c.childId === child.id && 
      c.approvalStatus === 'pending'
    )
  }, [completions, child.id])

  const { pendingChores, completedChores, missedChores, unavailableChores } = useMemo(() => {
    const pending: Array<{ chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm' }> = []
    const completed: Array<{ chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm' }> = []
    const missed: Array<{ chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm' }> = []
    const unavailable: Array<{ chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm'; windowStatus: ReturnType<typeof getTimeWindowStatus> }> = []

    childChores.forEach((chore) => {
      const assignment = childAssignments.find(a => a.choreId === chore.id)
      if (!assignment) return
      
      const windowStatus = getTimeWindowStatus(chore)
      
      if (chore.completionType === 'shareable' && chore.maxCompletions) {
        if (chore.timeOfDay === 'both') {
          const amCompleted = hasChildCompletedShareableChore(completions, chore.id, child.id, 'am', chore.resetPeriod)
          const pmCompleted = hasChildCompletedShareableChore(completions, chore.id, child.id, 'pm', chore.resetPeriod)
          const amFull = isShareableChoreFullyCompleted(completions, chore.id, chore.maxCompletions, 'am', chore.resetPeriod)
          const pmFull = isShareableChoreFullyCompleted(completions, chore.id, chore.maxCompletions, 'pm', chore.resetPeriod)
          
          if (currentTimeOfDay === 'am') {
            if (amCompleted) {
              completed.push({ chore, assignment, timeOfDay: 'am' })
            } else if (amFull) {
              return
            } else {
              if (!windowStatus.isWithinWindow) {
                unavailable.push({ chore, assignment, timeOfDay: 'am', windowStatus })
              } else {
                pending.push({ chore, assignment, timeOfDay: 'am' })
              }
            }
          } else {
            if (amCompleted) {
              completed.push({ chore, assignment, timeOfDay: 'am' })
            } else if (amFull) {
              missed.push({ chore, assignment, timeOfDay: 'am' })
            } else {
              missed.push({ chore, assignment, timeOfDay: 'am' })
            }
            
            if (pmCompleted) {
              completed.push({ chore, assignment, timeOfDay: 'pm' })
            } else if (pmFull) {
              return
            } else {
              if (!windowStatus.isWithinWindow) {
                unavailable.push({ chore, assignment, timeOfDay: 'pm', windowStatus })
              } else {
                pending.push({ chore, assignment, timeOfDay: 'pm' })
              }
            }
          }
          return
        } else if (chore.timeOfDay === 'am' || chore.timeOfDay === 'pm') {
          const timeOfDay = chore.timeOfDay
          const isCompleted = hasChildCompletedShareableChore(completions, chore.id, child.id, timeOfDay, chore.resetPeriod)
          const isFull = isShareableChoreFullyCompleted(completions, chore.id, chore.maxCompletions, timeOfDay, chore.resetPeriod)
          const isMissedChore = isChoreMissed(chore.timeOfDay, completions, chore.id, child.id)
          const isAvailable = isChoreAvailableNow(chore.timeOfDay)
          
          if (isCompleted) {
            completed.push({ chore, assignment, timeOfDay })
          } else if (isFull) {
            if (isMissedChore) {
              missed.push({ chore, assignment, timeOfDay })
            }
            return
          } else if (isMissedChore) {
            missed.push({ chore, assignment, timeOfDay })
          } else if (isAvailable) {
            if (!windowStatus.isWithinWindow) {
              unavailable.push({ chore, assignment, timeOfDay, windowStatus })
            } else {
              pending.push({ chore, assignment, timeOfDay })
            }
          }
          return
        } else {
          const isCompleted = hasChildCompletedShareableChore(completions, chore.id, child.id, undefined, chore.resetPeriod)
          const isFull = isShareableChoreFullyCompleted(completions, chore.id, chore.maxCompletions, undefined, chore.resetPeriod)
          
          if (isCompleted) {
            completed.push({ chore, assignment })
          } else if (isFull) {
            return
          } else {
            if (!windowStatus.isWithinWindow) {
              unavailable.push({ chore, assignment, windowStatus })
            } else {
              pending.push({ chore, assignment })
            }
          }
          return
        }
      }
      
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
            completed.push({ chore, assignment })
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
              unavailable.push({ chore, assignment, timeOfDay: 'am', windowStatus })
            } else {
              pending.push({ chore, assignment, timeOfDay: 'am' })
            }
          } else {
            completed.push({ chore, assignment, timeOfDay: 'am' })
          }
        } else {
          if (!amCompleted) {
            missed.push({ chore, assignment, timeOfDay: 'am' })
          } else {
            completed.push({ chore, assignment, timeOfDay: 'am' })
          }
          
          if (!pmCompleted) {
            if (!windowStatus.isWithinWindow) {
              unavailable.push({ chore, assignment, timeOfDay: 'pm', windowStatus })
            } else {
              pending.push({ chore, assignment, timeOfDay: 'pm' })
            }
          } else {
            completed.push({ chore, assignment, timeOfDay: 'pm' })
          }
        }
      } else if (chore.timeOfDay === 'am' || chore.timeOfDay === 'pm') {
        const isCompleted = isChoreCompleted(completions, chore.id, child.id, chore.frequency, chore.timeOfDay)
        const isMissedChore = isChoreMissed(chore.timeOfDay, completions, chore.id, child.id)
        const isAvailable = isChoreAvailableNow(chore.timeOfDay)
        
        if (isMissedChore) {
          missed.push({ chore, assignment, timeOfDay: chore.timeOfDay })
        } else if (!isCompleted && isAvailable) {
          if (!windowStatus.isWithinWindow) {
            unavailable.push({ chore, assignment, timeOfDay: chore.timeOfDay, windowStatus })
          } else {
            pending.push({ chore, assignment, timeOfDay: chore.timeOfDay })
          }
        } else if (isCompleted) {
          completed.push({ chore, assignment, timeOfDay: chore.timeOfDay })
        }
      } else {
        const isCompleted = isChoreCompleted(completions, chore.id, child.id, chore.frequency, chore.timeOfDay)
        if (isCompleted) {
          completed.push({ chore, assignment })
        } else {
          if (!windowStatus.isWithinWindow) {
            unavailable.push({ chore, assignment, windowStatus })
          } else {
            pending.push({ chore, assignment })
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

  // Check which chores are locked due to unmet prerequisites
  const lockedChoresInfo = useMemo(() => {
    const locked = new Map<string, Category | null>() // Map choreId to blockedByCategory
    const choresMap = new Map(chores.map(c => [c.id, c]))
    
    childChores.forEach((chore) => {
      const choreCategories = chore.categoryIds || []
      for (const categoryId of choreCategories) {
        const prerequisiteMet = isPrerequisiteCategoryCompleted(
          child.id,
          categoryId,
          categories,
          assignments,
          choresMap,
          completions
        )
        
        if (!prerequisiteMet) {
          const category = categories.find(c => c.id === categoryId)
          const blockedBy = category?.prerequisiteCategoryId 
            ? categories.find(c => c.id === category.prerequisiteCategoryId) || null
            : null
          locked.set(chore.id, blockedBy)
          break
        }
      }
    })
    
    return locked
  }, [childChores, child.id, categories, assignments, chores, completions])

  const initials = getInitialsFromName(child.name)

  const handleComplete = (chore: Chore, assignment: ChoreAssignment, timeOfDay?: 'am' | 'pm') => {
    if (celebrationSettings.enabled) {
      const animation = getRandomCelebrationAnimation(celebrationSettings)
      setCelebrating({ 
        points: getChorePointsForChild(chore, assignment, child.id),
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

  const categoriesWithBonuses = useMemo(() => {
    return categories.filter(cat => cat.completionBonus && cat.showInUpNext !== false)
  }, [categories])

  const categoryCompletionProgress = useMemo(() => {
    const choresMap = new Map(chores.map(c => [c.id, c]))
    return categoriesWithBonuses.map(category => {
      const progress = getCategoryCompletionProgress(
        child.id,
        category.id,
        assignments,
        choresMap,
        completions
      )
      return {
        category,
        progress,
      }
    })
  }, [categoriesWithBonuses, child.id, assignments, chores, completions])

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-8">
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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <Star weight="fill" className="h-6 w-6 text-accent" />
                  <span className="text-3xl font-fredoka text-accent">{totalPoints}</span>
                </div>
                {categoryPoints && categories.length > 0 && (
                  <>
                    {categories.map((category) => {
                      const points = categoryPoints.get(category.id) || 0
                      return (
                        <Badge
                          key={category.id}
                          variant="outline"
                          className="font-fredoka text-base"
                          style={{ borderColor: category.color, color: category.color }}
                        >
                          {category.name}: {points}
                        </Badge>
                      )
                    })}
                  </>
                )}
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
            {onHistoryClick && (
              <Button 
                size="lg"
                variant="outline"
                onClick={onHistoryClick} 
                className="text-lg px-6 py-6 font-fredoka"
              >
                <ChartLine className="mr-2 h-5 w-5" />
                History
              </Button>
            )}
            {onCalendarClick && (
              <Button 
                size="lg"
                variant="outline"
                onClick={onCalendarClick} 
                className="text-lg px-6 py-6 font-fredoka"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Calendar
              </Button>
            )}
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

        <OnThisDay
          child={child}
          chores={chores}
          completions={completions}
          assignments={assignments}
          categories={categories}
          onUpdateLastRefresh={onUpdateCalendarRefresh}
        />

        {categoryCompletionProgress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-fredoka font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Category Bonuses
            </h2>
            <div className="grid gap-3">
              {categoryCompletionProgress.map(({ category, progress }) => {
                const isComplete = progress.completed === progress.total && progress.total > 0
                const targetCategory = categories.find(c => c.id === category.completionBonus?.targetCategoryId)
                return (
                  <Card 
                    key={category.id} 
                    className={isComplete ? 'border-2 bg-gradient-to-r from-accent/10 to-primary/10' : ''}
                    style={isComplete ? { borderColor: category.color } : {}}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className="font-fredoka text-base px-3 py-1"
                              style={{ backgroundColor: category.color, color: 'white' }}
                            >
                              {category.name}
                            </Badge>
                            {isComplete && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                Complete!
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {progress.completed} / {progress.total} chores completed
                          </p>
                          {category.completionBonus && targetCategory && (
                            <p className="text-sm font-medium mt-1 flex items-center gap-1">
                              <Star weight="fill" className="h-4 w-4" style={{ color: category.color }} />
                              Earn {category.completionBonus.bonusPoints} {targetCategory.name} bonus points
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-fredoka font-bold" style={{ color: category.color }}>
                            {Math.round((progress.completed / progress.total) * 100) || 0}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: category.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(progress.completed / progress.total) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingChores.map(({ chore, assignment, timeOfDay }, index) => {
                    const isLocked = lockedChoresInfo.has(chore.id)
                    const blockedByCategory = isLocked ? lockedChoresInfo.get(chore.id) : null
                    
                    return (
                    <motion.div
                      key={`${chore.id}-${timeOfDay || 'anytime'}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={`${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-102'} transition-all hover:shadow-xl h-full`}
                        onClick={() => !isLocked && handleComplete(chore, assignment, timeOfDay)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <motion.div whileTap={{ scale: isLocked ? 1 : 0.9 }} className="mt-1">
                              {isLocked ? (
                                <Lock className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <Circle className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              {isLocked && blockedByCategory && (
                                <Badge variant="secondary" className="mb-2 flex items-center gap-1 w-fit">
                                  <Lock className="h-3 w-3" />
                                  Complete {blockedByCategory.name} first
                                </Badge>
                              )}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-xl font-fredoka font-bold">
                                  {chore.name}
                                </h3>
                                {getTimeOfDayLabel(timeOfDay)}
                              </div>
                              {(chore.completionType === 'shareable' || chore.completionType === 'once-per-day') && (
                                <div className="flex gap-1 mb-2">
                                  {chore.completionType === 'shareable' && chore.maxCompletions && (
                                    <div className="flex-1">
                                      <Badge variant="secondary" className="flex items-center gap-1 text-xs mb-1.5">
                                        <Users className="h-3 w-3" />
                                        Shareable - {getShareableChoreCompletionCount(completions, chore.id, timeOfDay, chore.resetPeriod)}/{chore.maxCompletions} completed
                                      </Badge>
                                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full bg-primary"
                                          initial={{ width: 0 }}
                                          animate={{ 
                                            width: `${(getShareableChoreCompletionCount(completions, chore.id, timeOfDay, chore.resetPeriod) / chore.maxCompletions) * 100}%` 
                                          }}
                                          transition={{ duration: 0.3 }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {chore.completionType === 'shareable' && !chore.maxCompletions && (
                                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                      <Users className="h-3 w-3" />
                                      Shareable
                                    </Badge>
                                  )}
                                  {chore.completionType === 'once-per-day' && (
                                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                      <Trophy className="h-3 w-3" />
                                      First Only
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {chore.categoryIds && chore.categoryIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {chore.categoryIds.map((categoryId) => {
                                    const category = categories.find(c => c.id === categoryId)
                                    if (!category) return null
                                    return (
                                      <Badge
                                        key={categoryId}
                                        variant="outline"
                                        className="font-fredoka font-semibold px-2 py-0.5 border text-xs"
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
                              {chore.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {chore.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {chore.categoryPoints && chore.categoryPoints.length > 0 ? (
                                  chore.categoryPoints.map((cp) => {
                                    const category = categories.find(c => c.id === cp.categoryId)
                                    if (!category) return null
                                    const categoryPoints = getChoreCategoryPointsForChild(chore, assignment, child.id, cp.categoryId)
                                    return (
                                      <Badge
                                        key={cp.categoryId}
                                        className="font-fredoka text-sm px-2 py-0.5"
                                        style={{
                                          backgroundColor: category.color,
                                          color: 'white',
                                        }}
                                      >
                                        <Star weight="fill" className="h-3 w-3 mr-1" />
                                        {chore.completionType === 'shareable' 
                                          ? `${categoryPoints} ${category.name}`
                                          : `${categoryPoints} ${category.name}`}
                                      </Badge>
                                    )
                                  })
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="font-fredoka text-sm px-2 py-0.5"
                                  >
                                    <Star weight="fill" className="h-3 w-3 mr-1" />
                                    {getChorePointsForChild(chore, assignment, child.id)} pts
                                  </Badge>
                                )}
                                {chore.estimatedDuration && (
                                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                    <Timer className="h-4 w-4" />
                                    <span>{formatDuration(chore.estimatedDuration)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )})}
                </div>
              </div>
            )}

            {pendingApprovalCompletions.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4 flex items-center gap-2 text-orange-600">
                  <ClockClockwise className="h-7 w-7" />
                  Pending Approval
                </h2>
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    These chores are waiting for parent approval before points are awarded. Your parent will review them soon!
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingApprovalCompletions.map((completion) => {
                    const chore = chores.find((c) => c.id === completion.choreId)
                    const assignment = childAssignments.find((a) => a.choreId === completion.choreId)
                    if (!chore || !assignment) return null

                    return (
                      <Card key={completion.id} className="border-2 border-orange-200 bg-orange-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <ClockClockwise
                              className="h-8 w-8 text-orange-600 flex-shrink-0 mt-1"
                              weight="bold"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-xl font-fredoka font-bold">
                                  {chore.name}
                                </h3>
                                {getTimeOfDayLabel(completion.timeOfDay)}
                              </div>
                              <Badge variant="secondary" className="bg-orange-200 text-orange-900 text-xs mb-2">
                                Awaiting Approval
                              </Badge>
                              {chore.categoryIds && chore.categoryIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {chore.categoryIds.map((categoryId) => {
                                    const category = categories.find(c => c.id === categoryId)
                                    if (!category) return null
                                    return (
                                      <Badge
                                        key={categoryId}
                                        variant="outline"
                                        className="font-fredoka font-semibold px-2 py-0.5 border text-xs"
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
                              <div className="flex items-center gap-2 flex-wrap">
                                {chore.categoryPoints && chore.categoryPoints.length > 0 ? (
                                  chore.categoryPoints.map((cp) => {
                                    const category = categories.find(c => c.id === cp.categoryId)
                                    if (!category) return null
                                    const categoryPoints = getChoreCategoryPointsForChild(chore, assignment, child.id, cp.categoryId)
                                    return (
                                      <Badge
                                        key={cp.categoryId}
                                        className="font-fredoka text-sm px-2 py-0.5 opacity-60"
                                        style={{
                                          backgroundColor: category.color,
                                          color: 'white',
                                        }}
                                      >
                                        <Star weight="fill" className="h-3 w-3 mr-1" />
                                        {categoryPoints} {category.name}
                                      </Badge>
                                    )
                                  })
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="font-fredoka text-sm px-2 py-0.5 opacity-60"
                                  >
                                    <Star weight="fill" className="h-3 w-3 mr-1" />
                                    {getChorePointsForChild(chore, assignment, child.id)} pts
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {completedChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4 text-muted-foreground">
                  Completed ✓
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedChores.map(({ chore, assignment, timeOfDay }) => (
                    <Card key={`${chore.id}-${timeOfDay || 'completed'}`} className="opacity-60">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle
                            weight="fill"
                            className="h-8 w-8 text-primary flex-shrink-0 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-xl font-fredoka font-bold line-through">
                                {chore.name}
                              </h3>
                              {getTimeOfDayLabel(timeOfDay)}
                            </div>
                            {chore.completionType === 'shareable' && chore.maxCompletions && (
                              <div className="mb-2">
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs mb-1.5">
                                  <Users className="h-3 w-3" />
                                  {getShareableChoreCompletionCount(completions, chore.id, timeOfDay, chore.resetPeriod)}/{chore.maxCompletions} completed
                                </Badge>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ 
                                      width: `${(getShareableChoreCompletionCount(completions, chore.id, timeOfDay, chore.resetPeriod) / chore.maxCompletions) * 100}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            {chore.categoryIds && chore.categoryIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {chore.categoryIds.map((categoryId) => {
                                  const category = categories.find(c => c.id === categoryId)
                                  if (!category) return null
                                  return (
                                    <Badge
                                      key={categoryId}
                                      variant="outline"
                                      className="font-fredoka font-semibold px-2 py-0.5 border text-xs"
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
                            <div className="flex items-center gap-2 flex-wrap">
                              {chore.categoryPoints && chore.categoryPoints.length > 0 ? (
                                chore.categoryPoints.map((cp) => {
                                  const category = categories.find(c => c.id === cp.categoryId)
                                  if (!category) return null
                                  const categoryPoints = getChoreCategoryPointsForChild(chore, assignment, child.id, cp.categoryId)
                                  return (
                                    <Badge
                                      key={cp.categoryId}
                                      className="font-fredoka text-sm px-2 py-0.5"
                                      style={{
                                        backgroundColor: category.color,
                                        color: 'white',
                                      }}
                                    >
                                      <Star weight="fill" className="h-3 w-3 mr-1" />
                                      {categoryPoints} {category.name}
                                    </Badge>
                                  )
                                })
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="font-fredoka text-sm px-2 py-0.5"
                                >
                                  <Star weight="fill" className="h-3 w-3 mr-1" />
                                  {getChorePointsForChild(chore, assignment, child.id)} pts
                                </Badge>
                              )}
                            </div>
                          </div>
                          {celebrationSettings.showUndoButton !== false && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUndo(chore.id, timeOfDay)
                              }}
                              className="flex-shrink-0"
                            >
                              <ArrowCounterClockwise className="h-4 w-4" />
                            </Button>
                          )}
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
                  {unavailableChores.map(({ chore, assignment, timeOfDay, windowStatus }) => (
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
                            {chore.completionType === 'shareable' && chore.maxCompletions && (
                              <div className="mb-2">
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs mb-1.5">
                                  <Users className="h-3 w-3" />
                                  {getShareableChoreCompletionCount(completions, chore.id, timeOfDay, chore.resetPeriod)}/{chore.maxCompletions} completed
                                </Badge>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ 
                                      width: `${(getShareableChoreCompletionCount(completions, chore.id, timeOfDay, chore.resetPeriod) / chore.maxCompletions) * 100}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            )}
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
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {chore.categoryPoints && chore.categoryPoints.length > 0 ? (
                                chore.categoryPoints.map((cp) => {
                                  const category = categories.find(c => c.id === cp.categoryId)
                                  if (!category) return null
                                  const categoryPoints = getChoreCategoryPointsForChild(chore, assignment, child.id, cp.categoryId)
                                  return (
                                    <Badge
                                      key={cp.categoryId}
                                      className="font-fredoka text-base px-3 py-1"
                                      style={{
                                        backgroundColor: category.color,
                                        color: 'white',
                                      }}
                                    >
                                      <Star weight="fill" className="h-4 w-4 mr-1" />
                                      {categoryPoints} {category.name} pts
                                    </Badge>
                                  )
                                })
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="font-fredoka text-lg px-3 py-1"
                                >
                                  <Star weight="fill" className="h-4 w-4 mr-1" />
                                  {getChorePointsForChild(chore, assignment, child.id)} pts
                                </Badge>
                              )}
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
