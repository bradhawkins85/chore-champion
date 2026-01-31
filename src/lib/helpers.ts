import { ChoreCompletion, ChoreFrequency, ChoreTimeOfDay, Chore, ChoreAssignment, DayOfWeek, Reward, RewardPurchase, PurchaseLimitInterval, CelebrationSettings, CelebrationAnimation, Category, ExchangeRate, CategoryBonusCompletion } from './types'

// Epoch date for bi-weekly period calculations (January 1, 2024 - a Monday)
const BI_WEEKLY_EPOCH = new Date('2024-01-01T00:00:00Z').getTime()

export function isCompletionApproved(completion: ChoreCompletion): boolean {
  if (!completion.approvalStatus) return true
  return completion.approvalStatus === 'approved'
}

export function doesChoreRequireApproval(chore: Chore, childId: string): boolean {
  if (!chore.approvalConfigs || chore.approvalConfigs.length === 0) return false
  const config = chore.approvalConfigs.find(c => c.childId === childId)
  return config ? config.requiresApproval : false
}

export function getRandomCelebrationAnimation(settings: CelebrationSettings): CelebrationAnimation {
  const enabledAnimations = (Object.keys(settings.animations) as CelebrationAnimation[])
    .filter(key => settings.animations[key])
  
  if (enabledAnimations.length === 0) {
    return 'confetti'
  }
  
  return enabledAnimations[Math.floor(Math.random() * enabledAnimations.length)]
}

export function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}

export function getDayOfWeekForDate(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getInitialsFromName(name?: string, fallback: string = '?'): string {
  if (!name) {
    return fallback
  }

  const trimmed = name.trim()
  if (!trimmed) {
    return fallback
  }

  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isRepeatPatternActiveOnDate(assignment: ChoreAssignment, date: Date): boolean {
  if (!assignment.repeatPattern) {
    return true
  }

  const pattern = assignment.repeatPattern
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  const anchorDate = pattern.anchorDate 
    ? new Date(pattern.anchorDate)
    : assignment.startDate 
    ? new Date(assignment.startDate)
    : new Date(assignment.assignedAt)
  
  anchorDate.setHours(0, 0, 0, 0)

  if (pattern.unit === 'weeks') {
    const dayOfWeek = getDayOfWeekForDate(checkDate)
    
    if (pattern.specificDays && pattern.specificDays.length > 0) {
      if (!pattern.specificDays.includes(dayOfWeek)) {
        return false
      }
    }

    const daysSinceAnchor = Math.floor((checkDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24))
    const weeksSinceAnchor = Math.floor(daysSinceAnchor / 7)
    
    return weeksSinceAnchor % pattern.interval === 0
  }

  return true
}

export function isRepeatPatternActiveToday(assignment: ChoreAssignment): boolean {
  return isRepeatPatternActiveOnDate(assignment, new Date())
}

export function isChoreActiveOnDate(assignment: ChoreAssignment, date: Date): boolean {
  if (!isRepeatPatternActiveOnDate(assignment, date)) {
    return false
  }

  if (!assignment.daysOfWeek || assignment.daysOfWeek.length === 0) {
    return true
  }
  const dayOfWeek = getDayOfWeekForDate(date)
  return assignment.daysOfWeek.includes(dayOfWeek)
}

export function isChoreActiveToday(assignment: ChoreAssignment): boolean {
  return isChoreActiveOnDate(assignment, new Date())
}

export function getCurrentTimeOfDay(): 'am' | 'pm' {
  const hour = new Date().getHours()
  return hour < 12 ? 'am' : 'pm'
}

export function isChoreAvailableNow(timeOfDay: ChoreTimeOfDay): boolean {
  if (timeOfDay === 'anytime' || timeOfDay === 'both') {
    return true
  }
  return getCurrentTimeOfDay() === timeOfDay
}

export function isChoreMissed(
  timeOfDay: ChoreTimeOfDay,
  completions: ChoreCompletion[],
  choreId: string,
  childId: string
): boolean {
  const currentTimeOfDay = getCurrentTimeOfDay()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (timeOfDay === 'am' && currentTimeOfDay === 'pm') {
    const completedToday = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= today.getTime() &&
        c.timeOfDay === 'am'
    )
    return !completedToday
  }
  
  return false
}

export function isChoreCompletedOnDate(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  date: Date,
  timeOfDay?: 'am' | 'pm'
): boolean {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) => {
      if (c.choreId !== choreId || c.childId !== childId || c.undoneAt) {
        return false
      }
      
      const completionDate = new Date(c.completedAt)
      completionDate.setHours(0, 0, 0, 0)
      
      if (completionDate.getTime() !== targetDate.getTime()) {
        return false
      }
      
      if (timeOfDay && c.timeOfDay !== timeOfDay) {
        return false
      }
      
      return true
    }
  )
}

export function isChoreCompletedForTimeOfDay(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  timeOfDay: 'am' | 'pm'
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= today.getTime() &&
      c.timeOfDay === timeOfDay &&
      isCompletionApproved(c)
  )
}

export function isChoreCompletedByAnyChildToday(
  completions: ChoreCompletion[],
  choreId: string,
  timeOfDay?: 'am' | 'pm'
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.completedAt >= today.getTime() &&
      (!timeOfDay || c.timeOfDay === timeOfDay) &&
      isCompletionApproved(c)
  )
}

/**
 * Calculate the start time of the current reset period based on the reset period type
 * @param resetPeriod - The reset period ('daily', 'weekly', 'bi-weekly', 'monthly'). Defaults to 'daily'
 * @returns Timestamp of the start of the current reset period
 */
export function getResetPeriodStart(resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'): number {
  const now = new Date()
  const periodStart = new Date(now)
  
  if (!resetPeriod || resetPeriod === 'daily') {
    // Reset at midnight (start of current day)
    periodStart.setHours(0, 0, 0, 0)
  } else if (resetPeriod === 'weekly') {
    // Reset at midnight on Monday (start of week)
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0 days to subtract
    periodStart.setDate(now.getDate() - daysToSubtract)
    periodStart.setHours(0, 0, 0, 0)
  } else if (resetPeriod === 'bi-weekly') {
    // Reset at midnight on Monday every 2 weeks
    // Use fixed epoch to calculate bi-weekly periods
    const dayOfWeek = now.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - daysToSubtract)
    thisMonday.setHours(0, 0, 0, 0)
    
    // Calculate how many weeks since epoch
    const weeksSinceEpoch = Math.floor((thisMonday.getTime() - BI_WEEKLY_EPOCH) / (7 * 24 * 60 * 60 * 1000))
    const biWeeklyPeriod = Math.floor(weeksSinceEpoch / 2)
    
    // Get the start of this bi-weekly period
    periodStart.setTime(BI_WEEKLY_EPOCH + biWeeklyPeriod * 2 * 7 * 24 * 60 * 60 * 1000)
  } else if (resetPeriod === 'monthly') {
    // Reset at midnight on the 1st of the month
    periodStart.setDate(1)
    periodStart.setHours(0, 0, 0, 0)
  }
  
  return periodStart.getTime()
}

/**
 * Calculate the start time of the reset period for a specific date
 * Used for historical calculations (e.g., expired points)
 */
function getResetPeriodStartForDate(date: Date, resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'): number {
  const periodStart = new Date(date)
  
  if (!resetPeriod || resetPeriod === 'daily') {
    periodStart.setHours(0, 0, 0, 0)
  } else if (resetPeriod === 'weekly') {
    const dayOfWeek = date.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    periodStart.setDate(date.getDate() - daysToSubtract)
    periodStart.setHours(0, 0, 0, 0)
  } else if (resetPeriod === 'bi-weekly') {
    const dayOfWeek = date.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const thisMonday = new Date(date)
    thisMonday.setDate(date.getDate() - daysToSubtract)
    thisMonday.setHours(0, 0, 0, 0)
    
    const weeksSinceEpoch = Math.floor((thisMonday.getTime() - BI_WEEKLY_EPOCH) / (7 * 24 * 60 * 60 * 1000))
    const biWeeklyPeriod = Math.floor(weeksSinceEpoch / 2)
    
    periodStart.setTime(BI_WEEKLY_EPOCH + biWeeklyPeriod * 2 * 7 * 24 * 60 * 60 * 1000)
  } else if (resetPeriod === 'monthly') {
    periodStart.setDate(1)
    periodStart.setHours(0, 0, 0, 0)
  }
  
  return periodStart.getTime()
}

/**
 * Calculate the start of the next reset period given a period start time
 */
function getNextResetPeriodStart(periodStart: number, resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'): number {
  const nextPeriod = new Date(periodStart)
  
  if (!resetPeriod || resetPeriod === 'daily') {
    nextPeriod.setDate(nextPeriod.getDate() + 1)
  } else if (resetPeriod === 'weekly') {
    nextPeriod.setDate(nextPeriod.getDate() + 7)
  } else if (resetPeriod === 'bi-weekly') {
    nextPeriod.setDate(nextPeriod.getDate() + 14)
  } else if (resetPeriod === 'monthly') {
    nextPeriod.setMonth(nextPeriod.getMonth() + 1)
  }
  
  return nextPeriod.getTime()
}

export function getShareableChoreCompletionCount(
  completions: ChoreCompletion[],
  choreId: string,
  timeOfDay?: 'am' | 'pm',
  resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
): number {
  const periodStart = getResetPeriodStart(resetPeriod)
  
  const uniqueChildren = new Set<string>()
  
  completions.forEach((c) => {
    if (
      c.choreId === choreId &&
      c.completedAt >= periodStart &&
      (!timeOfDay || c.timeOfDay === timeOfDay) &&
      isCompletionApproved(c)
    ) {
      uniqueChildren.add(c.childId)
    }
  })
  
  return uniqueChildren.size
}

export function isShareableChoreFullyCompleted(
  completions: ChoreCompletion[],
  choreId: string,
  maxCompletions: number,
  timeOfDay?: 'am' | 'pm',
  resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
): boolean {
  return getShareableChoreCompletionCount(completions, choreId, timeOfDay, resetPeriod) >= maxCompletions
}

export function hasChildCompletedShareableChore(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  timeOfDay?: 'am' | 'pm',
  resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
): boolean {
  const periodStart = getResetPeriodStart(resetPeriod)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= periodStart &&
      (!timeOfDay || c.timeOfDay === timeOfDay) &&
      isCompletionApproved(c)
  )
}

export function isChoreCompletedToday(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (choreTimeOfDay === 'both') {
    const amCompleted = isChoreCompletedForTimeOfDay(completions, choreId, childId, 'am')
    const pmCompleted = isChoreCompletedForTimeOfDay(completions, choreId, childId, 'pm')
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return isChoreCompletedForTimeOfDay(completions, choreId, childId, choreTimeOfDay)
  }
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= today.getTime() &&
      isCompletionApproved(c)
  )
}

export function isChoreCompletedThisWeek(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  if (choreTimeOfDay === 'both') {
    const amCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === 'am' &&
        isCompletionApproved(c)
    )
    const pmCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === 'pm' &&
        isCompletionApproved(c)
    )
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === choreTimeOfDay &&
        isCompletionApproved(c)
    )
  }
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= startOfWeek.getTime() &&
      isCompletionApproved(c)
  )
}

export function isChoreCompletedThisBiWeek(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const startOfBiWeek = new Date(startOfWeek)
  const weekNumber = Math.floor((startOfWeek.getTime() - new Date(startOfWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
  
  if (weekNumber % 2 === 1) {
    startOfBiWeek.setDate(startOfBiWeek.getDate() - 7)
  }
  
  if (choreTimeOfDay === 'both') {
    const amCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === 'am' &&
        isCompletionApproved(c)
    )
    const pmCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === 'pm' &&
        isCompletionApproved(c)
    )
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === choreTimeOfDay &&
        isCompletionApproved(c)
    )
  }
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= startOfBiWeek.getTime() &&
      isCompletionApproved(c)
  )
}

export function isChoreCompleted(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  frequency: ChoreFrequency,
  choreTimeOfDay?: ChoreTimeOfDay
): boolean {
  const timeOfDay = choreTimeOfDay || 'anytime'
  if (frequency === 'daily') {
    return isChoreCompletedToday(completions, choreId, childId, timeOfDay)
  } else if (frequency === 'weekly') {
    return isChoreCompletedThisWeek(completions, choreId, childId, timeOfDay)
  } else {
    return isChoreCompletedThisBiWeek(completions, choreId, childId, timeOfDay)
  }
}

export function isChoreActive(assignment: ChoreAssignment): boolean {
  const now = Date.now()
  
  if (assignment.startDate && now < assignment.startDate) {
    return false
  }
  
  if (assignment.endDate && now > assignment.endDate) {
    return false
  }
  
  return true
}

export function isChoreActiveForDate(assignment: ChoreAssignment, date: Date): boolean {
  const timestamp = date.getTime()
  
  if (assignment.startDate && timestamp < assignment.startDate) {
    return false
  }
  
  if (assignment.endDate && timestamp > assignment.endDate) {
    return false
  }
  
  return true
}

export function getChorePointsForChild(
  chore: { points: number },
  assignment: ChoreAssignment | undefined,
  childId: string
): number {
  if (!assignment) return chore.points
  const override = assignment.pointOverrides?.find(o => o.childId === childId)
  return override ? override.points : chore.points
}

export function getChoreCategoryPointsForChild(
  chore: { 
    categoryPoints?: { categoryId: string; points: number }[]
  },
  assignment: ChoreAssignment | undefined,
  childId: string,
  categoryId: string
): number {
  if (assignment) {
    const override = assignment.categoryPointOverrides?.find(
      o => o.childId === childId && o.categoryId === categoryId
    )
    if (override) return override.points
  }
  
  const categoryPoint = chore.categoryPoints?.find(cp => cp.categoryId === categoryId)
  return categoryPoint ? categoryPoint.points : 0
}

export function getRewardCostForChild(
  reward: { cost: number; costOverrides?: { childId: string; cost: number }[] },
  childId: string
): number {
  const override = reward.costOverrides?.find(o => o.childId === childId)
  return override ? override.cost : reward.cost
}

export function isRewardAvailableForChild(
  reward: { requirements?: { childId: string; requiredChoreIds: string[] }[] },
  childId: string,
  completions: ChoreCompletion[],
  choresMap: Map<string, { frequency: ChoreFrequency; timeOfDay?: ChoreTimeOfDay }>
): boolean {
  const requirement = reward.requirements?.find(r => r.childId === childId)
  if (!requirement || requirement.requiredChoreIds.length === 0) {
    return true
  }

  return requirement.requiredChoreIds.every(choreId => {
    const chore = choresMap.get(choreId)
    if (!chore) return false
    return isChoreCompleted(completions, choreId, childId, chore.frequency, chore.timeOfDay)
  })
}

export function getChildTotalPoints(
  completions: ChoreCompletion[],
  choresMap: Map<string, { points: number; completionType?: string; resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' }>,
  childId: string,
  assignments?: ChoreAssignment[]
): number {
  return completions
    .filter((c) => c.childId === childId && isCompletionApproved(c))
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      if (!chore) return sum
      
      const assignment = assignments?.find(a => a.childId === childId && a.choreId === c.choreId)
      const chorePoints = getChorePointsForChild(chore, assignment, childId)
      
      if (chore.completionType === 'shareable' && assignments) {
        const assignedChildren = assignments.filter(a => a.choreId === c.choreId).length
        if (assignedChildren > 1) {
          const periodStart = getResetPeriodStart(chore.resetPeriod)
          const completionsInPeriod = completions.filter(comp => 
            comp.choreId === c.choreId && 
            comp.completedAt >= periodStart &&
            (!c.timeOfDay || comp.timeOfDay === c.timeOfDay) &&
            isCompletionApproved(comp)
          )
          
          const childrenWhoCompleted = new Set(completionsInPeriod.map(comp => comp.childId)).size
          if (childrenWhoCompleted > 0) {
            return sum + (chorePoints / childrenWhoCompleted)
          }
        }
      }
      
      return sum + chorePoints
    }, 0)
}

export function getChildAvailablePoints(
  totalPoints: number,
  purchases: { cost: number }[]
): number {
  const spent = purchases.reduce((sum, p) => sum + p.cost, 0)
  return totalPoints - spent
}

export const AVATAR_COLORS = [
  'oklch(0.6 0.22 290)',
  'oklch(0.72 0.18 45)',
  'oklch(0.65 0.12 240)',
  'oklch(0.7 0.18 150)',
  'oklch(0.68 0.2 340)',
  'oklch(0.75 0.15 80)',
]

function getIntervalStartTime(interval: PurchaseLimitInterval): number {
  const now = new Date()
  
  switch (interval) {
    case 'day':
      now.setHours(0, 0, 0, 0)
      return now.getTime()
    
    case 'week':
      now.setDate(now.getDate() - now.getDay())
      now.setHours(0, 0, 0, 0)
      return now.getTime()
    
    case 'month':
      now.setDate(1)
      now.setHours(0, 0, 0, 0)
      return now.getTime()
    
    case 'ever':
      return 0
  }
}

export function getPurchaseCount(
  purchases: RewardPurchase[],
  rewardId: string,
  interval: PurchaseLimitInterval,
  childId?: string
): number {
  const startTime = getIntervalStartTime(interval)
  
  return purchases.filter(p => {
    if (p.rewardId !== rewardId) return false
    if (p.purchasedAt < startTime) return false
    if (childId && p.childId !== childId) return false
    return true
  }).length
}

export function canPurchaseReward(
  reward: Reward,
  childId: string,
  purchases: RewardPurchase[]
): { canPurchase: boolean; reason?: string; currentCount?: number; maxCount?: number } {
  if (!reward.purchaseLimit) {
    return { canPurchase: true }
  }

  const { maxPurchases, interval, scope } = reward.purchaseLimit
  
  const currentCount = getPurchaseCount(
    purchases,
    reward.id,
    interval,
    scope === 'per-child' ? childId : undefined
  )

  if (currentCount >= maxPurchases) {
    const intervalText = interval === 'ever' ? 'total' : `per ${interval}`
    const scopeText = scope === 'per-child' ? 'for you' : 'in total'
    
    return {
      canPurchase: false,
      reason: `Limit reached: ${maxPurchases} ${intervalText} ${scopeText}`,
      currentCount,
      maxCount: maxPurchases,
    }
  }

  return {
    canPurchase: true,
    currentCount,
    maxCount: maxPurchases,
  }
}

export function timeToMinutes(time?: string): number {
  if (!time) return Infinity
  
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return Infinity
  
  return hours * 60 + minutes
}

export function sortChoresByDesiredTime<T extends { chore: { desiredTime?: string } }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const timeA = timeToMinutes(a.chore.desiredTime)
    const timeB = timeToMinutes(b.chore.desiredTime)
    return timeA - timeB
  })
}

export function getCurrentTimeInMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function isWithinTimeWindow(chore: { timeWindow?: { startTime: string; endTime: string } }): boolean {
  if (!chore.timeWindow) {
    return true
  }

  const currentMinutes = getCurrentTimeInMinutes()
  const startMinutes = timeToMinutes(chore.timeWindow.startTime)
  const endMinutes = timeToMinutes(chore.timeWindow.endTime)

  if (startMinutes === Infinity || endMinutes === Infinity) {
    return true
  }

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  }
}

export function getTimeWindowStatus(chore: { timeWindow?: { startTime: string; endTime: string } }): {
  isWithinWindow: boolean
  isBefore: boolean
  isAfter: boolean
  startTime?: string
  endTime?: string
} {
  if (!chore.timeWindow) {
    return { isWithinWindow: true, isBefore: false, isAfter: false }
  }

  const currentMinutes = getCurrentTimeInMinutes()
  const startMinutes = timeToMinutes(chore.timeWindow.startTime)
  const endMinutes = timeToMinutes(chore.timeWindow.endTime)

  if (startMinutes === Infinity || endMinutes === Infinity) {
    return { isWithinWindow: true, isBefore: false, isAfter: false }
  }

  const isWithin = isWithinTimeWindow(chore)
  
  let isBefore = false
  let isAfter = false

  if (!isWithin) {
    if (startMinutes <= endMinutes) {
      isBefore = currentMinutes < startMinutes
      isAfter = currentMinutes > endMinutes
    } else {
      isBefore = currentMinutes > endMinutes && currentMinutes < startMinutes
    }
  }

  return {
    isWithinWindow: isWithin,
    isBefore,
    isAfter,
    startTime: chore.timeWindow.startTime,
    endTime: chore.timeWindow.endTime,
  }
}

export function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return time24
  
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function getChildPointsByCategory(
  completions: ChoreCompletion[],
  choresMap: Map<string, {
    points: number
    completionType?: string
    resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
    categoryIds: string[]
    categoryPoints?: { categoryId: string; points: number }[]
  }>,
  childId: string,
  categoryId: string,
  assignments?: ChoreAssignment[],
  bonusCompletions?: Array<{ childId: string; targetCategoryId: string; bonusPoints: number; completedAt: number }>,
  category?: { pointsExpiry?: { enabled: boolean; interval: 'daily' | 'weekly' | 'monthly' | 'never' } }
): number {
  const chorePoints = completions
    .filter((c) => c.childId === childId && isCompletionApproved(c))
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      if (!chore || !chore.categoryIds.includes(categoryId)) return sum
      
      const assignment = assignments?.find(a => a.childId === childId && a.choreId === c.choreId)
      const chorePoints = getChoreCategoryPointsForChild(chore, assignment, childId, categoryId)
      
      if (chore.completionType === 'shareable' && assignments) {
        const assignedChildren = assignments.filter(a => a.choreId === c.choreId).length
        if (assignedChildren > 1) {
          const periodStart = getResetPeriodStart(chore.resetPeriod)
          const completionsInPeriod = completions.filter(comp => 
            comp.choreId === c.choreId && 
            comp.completedAt >= periodStart &&
            (!c.timeOfDay || comp.timeOfDay === c.timeOfDay) &&
            isCompletionApproved(comp)
          )
          
          const childrenWhoCompleted = new Set(completionsInPeriod.map(comp => comp.childId)).size
          if (childrenWhoCompleted > 0) {
            return sum + (chorePoints / childrenWhoCompleted)
          }
        }
      }
      
      return sum + chorePoints
    }, 0)

  const bonusPoints = bonusCompletions
    ? bonusCompletions
        .filter((bc) => bc.childId === childId && bc.targetCategoryId === categoryId)
        .reduce((sum, bc) => sum + bc.bonusPoints, 0)
    : 0

  const totalPoints = chorePoints + bonusPoints

  if (category) {
    const expiredPoints = getExpiredPointsByCategory(
      completions,
      choresMap,
      childId,
      categoryId,
      category,
      assignments,
      bonusCompletions
    )
    return Math.max(0, totalPoints - expiredPoints)
  }

  return totalPoints
}

export function getChildAvailablePointsByCategory(
  totalPoints: number,
  purchases: { rewardId: string; cost: number }[],
  rewardsMap: Map<string, { categoryIds: string[] }>,
  categoryId: string,
  swaps?: { fromCategoryId: string; toCategoryId: string; fromAmount: number; toAmount: number }[]
): number {
  const spent = purchases.reduce((sum, p) => {
    const reward = rewardsMap.get(p.rewardId)
    if (reward && reward.categoryIds.includes(categoryId)) {
      return sum + p.cost
    }
    return sum
  }, 0)
  
  let netSwaps = 0
  if (swaps) {
    swaps.forEach((swap) => {
      if (swap.fromCategoryId === categoryId) {
        netSwaps -= swap.fromAmount
      }
      if (swap.toCategoryId === categoryId) {
        netSwaps += swap.toAmount
      }
    })
  }
  
  return totalPoints + netSwaps - spent
}

export function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return ''
  
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`
  }
  
  return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  {
    name: 'Regular',
    color: 'oklch(0.6 0.22 290)',
    description: 'Daily activities and routine chores',
    exchangeRates: [
      {
        fromCategoryId: 'Regular',
        toCategoryId: 'Extra',
        fromAmount: 100,
        toAmount: 10,
      }
    ],
    pointsExpiry: {
      enabled: true,
      interval: 'daily',
    }
  },
  {
    name: 'Extra',
    color: 'oklch(0.72 0.18 45)',
    description: 'Special chores for extra rewards',
    exchangeRates: [],
    pointsExpiry: {
      enabled: false,
      interval: 'never',
    }
  },
]

export function getNextUpcomingChore(
  childId: string,
  assignments: ChoreAssignment[],
  choresMap: Map<string, Chore>,
  completions: ChoreCompletion[]
): { chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm' } | null {
  const currentMinutes = getCurrentTimeInMinutes()
  const currentTimeOfDay = getCurrentTimeOfDay()
  
  const childAssignments = assignments.filter(
    (a) => a.childId === childId && isChoreActive(a) && isChoreActiveToday(a)
  )

  const upcomingChores = childAssignments
    .map((assignment) => {
      const chore = choresMap.get(assignment.choreId)
      if (!chore) return null

      const effectiveTimeOfDay = assignment.timeOfDay || chore.timeOfDay || 'anytime'
      const effectiveTimeWindow = assignment.timeWindow || chore.timeWindow

      if (chore.completionType === 'once-per-day') {
        const completedByAnyone = isChoreCompletedByAnyChildToday(completions, chore.id)
        if (completedByAnyone) return null
      }

      if (effectiveTimeOfDay === 'both') {
        const amCompleted = isChoreCompletedForTimeOfDay(completions, chore.id, childId, 'am')
        const pmCompleted = isChoreCompletedForTimeOfDay(completions, chore.id, childId, 'pm')
        
        if (!amCompleted && currentTimeOfDay === 'am') {
          return { chore, assignment, timeOfDay: 'am' as const, effectiveTimeWindow, sortTime: 0 }
        }
        if (!pmCompleted && currentTimeOfDay === 'pm') {
          return { chore, assignment, timeOfDay: 'pm' as const, effectiveTimeWindow, sortTime: 720 }
        }
        if (!amCompleted && currentTimeOfDay === 'pm') {
          return null
        }
        if (!pmCompleted && currentTimeOfDay === 'am') {
          return { chore, assignment, timeOfDay: 'pm' as const, effectiveTimeWindow, sortTime: 720 }
        }
        return null
      }

      if (effectiveTimeOfDay === 'am') {
        if (currentTimeOfDay === 'pm') return null
        const completed = isChoreCompletedForTimeOfDay(completions, chore.id, childId, 'am')
        if (completed) return null
        return { chore, assignment, timeOfDay: 'am' as const, effectiveTimeWindow, sortTime: 0 }
      }

      if (effectiveTimeOfDay === 'pm') {
        if (currentTimeOfDay === 'am') {
          return { chore, assignment, timeOfDay: 'pm' as const, effectiveTimeWindow, sortTime: 720 }
        }
        const completed = isChoreCompletedForTimeOfDay(completions, chore.id, childId, 'pm')
        if (completed) return null
        return { chore, assignment, timeOfDay: 'pm' as const, effectiveTimeWindow, sortTime: 720 }
      }

      const completed = isChoreCompletedToday(completions, chore.id, childId, effectiveTimeOfDay)
      if (completed) return null

      let sortTime = currentMinutes
      if (effectiveTimeWindow) {
        const startMinutes = timeToMinutes(effectiveTimeWindow.startTime)
        if (startMinutes !== Infinity) {
          sortTime = startMinutes
        }
      } else if (chore.desiredTime) {
        const desiredMinutes = timeToMinutes(chore.desiredTime)
        if (desiredMinutes !== Infinity) {
          sortTime = desiredMinutes
        }
      }

      return { chore, assignment, effectiveTimeWindow, sortTime }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  upcomingChores.sort((a, b) => {
    if (a.effectiveTimeWindow && !b.effectiveTimeWindow) return -1
    if (!a.effectiveTimeWindow && b.effectiveTimeWindow) return 1
    
    return a.sortTime - b.sortTime
  })

  if (upcomingChores.length === 0) return null

  const firstChore = upcomingChores[0]
  return {
    chore: firstChore.chore,
    assignment: firstChore.assignment,
    timeOfDay: firstChore.timeOfDay,
  }
}

export function isRewardActive(reward: { startDate?: number; expiryDate?: number }): boolean {
  const now = Date.now()
  
  if (reward.startDate && now < reward.startDate) {
    return false
  }
  
  if (reward.expiryDate && now > reward.expiryDate) {
    return false
  }
  
  return true
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const MAX_FAILED_ATTEMPTS = 5
const BASE_LOCKOUT_DURATION = 30000
const MAX_LOCKOUT_DURATION = 3600000

export function calculateLockoutDuration(failedAttempts: number): number {
  if (failedAttempts < MAX_FAILED_ATTEMPTS) {
    return 0
  }
  
  const attemptsOverLimit = failedAttempts - MAX_FAILED_ATTEMPTS + 1
  const duration = Math.min(
    BASE_LOCKOUT_DURATION * Math.pow(2, attemptsOverLimit - 1),
    MAX_LOCKOUT_DURATION
  )
  
  return duration
}

export function isAccountLocked(pinSecurity: { lockedUntil: number | null; failedAttempts: number }): {
  isLocked: boolean
  remainingTime?: number
} {
  if (!pinSecurity.lockedUntil) {
    return { isLocked: false }
  }
  
  const now = Date.now()
  
  if (now < pinSecurity.lockedUntil) {
    return {
      isLocked: true,
      remainingTime: pinSecurity.lockedUntil - now,
    }
  }
  
  return { isLocked: false }
}

export function formatLockoutTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000)
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  
  const minutes = Math.ceil(seconds / 60)
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

export function getAvailableExchangeRates(
  category: Category,
  categories: Category[]
): ExchangeRate[] {
  if (!category.exchangeRates || category.exchangeRates.length === 0) {
    return []
  }
  
  return category.exchangeRates.map((rate) => {
    const targetCategory = categories.find((cat) => 
      cat.id === rate.toCategoryId || cat.name === rate.toCategoryId
    )
    
    return {
      fromCategoryId: category.id,
      toCategoryId: targetCategory?.id || rate.toCategoryId,
      fromAmount: rate.fromAmount,
      toAmount: rate.toAmount,
    }
  }).filter((rate) => 
    categories.some((cat) => cat.id === rate.toCategoryId)
  )
}

export function getAllChoresInCategoryForChild(
  childId: string,
  categoryId: string,
  assignments: ChoreAssignment[],
  choresMap: Map<string, Chore>
): Array<{ chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm' }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const childAssignments = assignments.filter(
    (a) => a.childId === childId && isChoreActive(a) && isChoreActiveToday(a)
  )

  const categoryChores: Array<{ chore: Chore; assignment: ChoreAssignment; timeOfDay?: 'am' | 'pm' }> = []

  childAssignments.forEach((assignment) => {
    const chore = choresMap.get(assignment.choreId)
    if (!chore || !chore.categoryIds.includes(categoryId)) return

    const effectiveTimeOfDay = assignment.timeOfDay || chore.timeOfDay || 'anytime'

    if (effectiveTimeOfDay === 'both') {
      categoryChores.push({ chore, assignment, timeOfDay: 'am' })
      categoryChores.push({ chore, assignment, timeOfDay: 'pm' })
    } else if (effectiveTimeOfDay === 'am' || effectiveTimeOfDay === 'pm') {
      categoryChores.push({ chore, assignment, timeOfDay: effectiveTimeOfDay })
    } else {
      categoryChores.push({ chore, assignment })
    }
  })

  return categoryChores
}

export function areAllCategoryChoresCompleted(
  childId: string,
  categoryId: string,
  assignments: ChoreAssignment[],
  choresMap: Map<string, Chore>,
  completions: ChoreCompletion[]
): boolean {
  const categoryChores = getAllChoresInCategoryForChild(childId, categoryId, assignments, choresMap)
  
  // If there are no chores in this category for this child, consider it completed (vacuously true)
  if (categoryChores.length === 0) return true

  // Filter out missed chores - they should not block prerequisite completion
  const nonMissedChores = categoryChores.filter(({ chore, timeOfDay }) => {
    const choreTimeOfDay = timeOfDay || chore.timeOfDay || 'anytime'
    return !isChoreMissed(choreTimeOfDay, completions, chore.id, childId)
  })

  // If all chores are missed, consider the category completed
  if (nonMissedChores.length === 0) return true

  return nonMissedChores.every(({ chore, timeOfDay }) => {
    if (chore.completionType === 'once-per-day') {
      return isChoreCompletedByAnyChildToday(completions, chore.id, timeOfDay)
    }
    
    if (timeOfDay) {
      return isChoreCompletedForTimeOfDay(completions, chore.id, childId, timeOfDay)
    }
    
    const choreTimeOfDay = chore.timeOfDay || 'anytime'
    return isChoreCompletedToday(completions, chore.id, childId, choreTimeOfDay)
  })
}

export function getCategoryCompletionProgress(
  childId: string,
  categoryId: string,
  assignments: ChoreAssignment[],
  choresMap: Map<string, Chore>,
  completions: ChoreCompletion[]
): { completed: number; total: number } {
  const categoryChores = getAllChoresInCategoryForChild(childId, categoryId, assignments, choresMap)
  
  const completed = categoryChores.filter(({ chore, timeOfDay }) => {
    if (chore.completionType === 'once-per-day') {
      return isChoreCompletedByAnyChildToday(completions, chore.id, timeOfDay)
    }
    
    if (timeOfDay) {
      return isChoreCompletedForTimeOfDay(completions, chore.id, childId, timeOfDay)
    }
    
    const choreTimeOfDay = chore.timeOfDay || 'anytime'
    return isChoreCompletedToday(completions, chore.id, childId, choreTimeOfDay)
  }).length

  return { completed, total: categoryChores.length }
}

export function hasBonusBeenClaimedToday(
  childId: string,
  categoryId: string,
  bonusCompletions: Array<{ childId: string; categoryId: string; completedAt: number }>
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTimestamp = today.getTime()

  return bonusCompletions.some(
    (bc) =>
      bc.childId === childId &&
      bc.categoryId === categoryId &&
      bc.completedAt >= todayTimestamp
  )
}

export function isPrerequisiteCategoryCompleted(
  childId: string,
  categoryId: string,
  categories: Category[],
  assignments: ChoreAssignment[],
  choresMap: Map<string, Chore>,
  completions: ChoreCompletion[]
): boolean {
  const category = categories.find((c) => c.id === categoryId)
  
  // No prerequisite means the category is available
  if (!category || !category.prerequisiteCategoryId) {
    return true
  }
  
  // Check if the prerequisite category itself has its prerequisites satisfied
  const prerequisiteAvailable = isPrerequisiteCategoryCompleted(
    childId,
    category.prerequisiteCategoryId,
    categories,
    assignments,
    choresMap,
    completions
  )
  
  if (!prerequisiteAvailable) {
    return false
  }
  
  // Check if all chores in the prerequisite category are completed
  return areAllCategoryChoresCompleted(
    childId,
    category.prerequisiteCategoryId,
    assignments,
    choresMap,
    completions
  )
}

export function getExpiryStartTime(interval: 'daily' | 'weekly' | 'monthly' | 'never'): number {
  if (interval === 'never') {
    return 0
  }

  const now = new Date()
  
  switch (interval) {
    case 'daily':
      now.setHours(0, 0, 0, 0)
      return now.getTime()
    
    case 'weekly':
      now.setDate(now.getDate() - now.getDay())
      now.setHours(0, 0, 0, 0)
      return now.getTime()
    
    case 'monthly':
      now.setDate(1)
      now.setHours(0, 0, 0, 0)
      return now.getTime()
  }
}

export function getExpiredPointsByCategory(
  completions: ChoreCompletion[],
  choresMap: Map<string, { 
    points: number
    completionType?: string
    resetPeriod?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
    categoryIds: string[]
    categoryPoints?: { categoryId: string; points: number }[]
  }>,
  childId: string,
  categoryId: string,
  category: { pointsExpiry?: { enabled: boolean; interval: 'daily' | 'weekly' | 'monthly' | 'never' } },
  assignments?: ChoreAssignment[],
  bonusCompletions?: Array<{ childId: string; targetCategoryId: string; bonusPoints: number; completedAt: number }>
): number {
  if (!category.pointsExpiry || !category.pointsExpiry.enabled || category.pointsExpiry.interval === 'never') {
    return 0
  }

  const expiryStartTime = getExpiryStartTime(category.pointsExpiry.interval)
  
  const expiredChorePoints = completions
    .filter((c) => c.childId === childId && isCompletionApproved(c) && c.completedAt < expiryStartTime)
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      if (!chore || !chore.categoryIds.includes(categoryId)) return sum
      
      const assignment = assignments?.find(a => a.childId === childId && a.choreId === c.choreId)
      const chorePoints = getChoreCategoryPointsForChild(chore, assignment, childId, categoryId)
      
      if (chore.completionType === 'shareable' && assignments) {
        const assignedChildren = assignments.filter(a => a.choreId === c.choreId).length
        if (assignedChildren > 1) {
          const completionDate = new Date(c.completedAt)
          const completionPeriodStart = getResetPeriodStartForDate(completionDate, chore.resetPeriod)
          
          const completionsInThatPeriod = completions.filter(comp => {
            return comp.choreId === c.choreId && 
              comp.completedAt >= completionPeriodStart &&
              comp.completedAt < getNextResetPeriodStart(completionPeriodStart, chore.resetPeriod) &&
              (!c.timeOfDay || comp.timeOfDay === c.timeOfDay) &&
              isCompletionApproved(comp)
          })
          
          const childrenWhoCompleted = new Set(completionsInThatPeriod.map(comp => comp.childId)).size
          if (childrenWhoCompleted > 0) {
            return sum + (chorePoints / childrenWhoCompleted)
          }
        }
      }
      
      return sum + chorePoints
    }, 0)

  const expiredBonusPoints = bonusCompletions
    ? bonusCompletions
        .filter((bc) => bc.childId === childId && bc.targetCategoryId === categoryId && bc.completedAt < expiryStartTime)
        .reduce((sum, bc) => sum + bc.bonusPoints, 0)
    : 0

  return expiredChorePoints + expiredBonusPoints
}

export async function getUserIPAddress(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || null
  } catch (error) {
    console.error('Failed to fetch IP address:', error)
    return null
  }
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.')
  return parts.reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0
}

function parseCIDR(cidr: string): { network: number; mask: number } | null {
  const parts = cidr.split('/')
  if (parts.length !== 2) {
    return null
  }

  const [ipPart, prefixPart] = parts
  const prefix = parseInt(prefixPart, 10)

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null
  }

  if (!isValidSingleIPAddress(ipPart)) {
    return null
  }

  const ip = ipToNumber(ipPart)
  const mask = (0xffffffff << (32 - prefix)) >>> 0
  const network = (ip & mask) >>> 0

  return { network, mask }
}

function isIPInCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr)
  if (!parsed) {
    return false
  }

  const ipNum = ipToNumber(ip)
  return ((ipNum & parsed.mask) >>> 0) === parsed.network
}

function isValidSingleIPAddress(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  
  if (!ipv4Pattern.test(ip)) {
    return false
  }
  
  const parts = ip.split('.')
  return parts.every(part => {
    const num = parseInt(part, 10)
    return num >= 0 && num <= 255
  })
}

export function isIPAllowed(
  currentIP: string | null,
  settings: { enabled: boolean; allowedIPs: string[] }
): boolean {
  if (!settings.enabled) {
    return true
  }
  
  if (!currentIP) {
    return false
  }
  
  if (settings.allowedIPs.length === 0) {
    return true
  }
  
  return settings.allowedIPs.some(allowedIP => {
    if (allowedIP.includes('/')) {
      return isIPInCIDR(currentIP, allowedIP)
    }
    return allowedIP === currentIP
  })
}

export function isValidIPAddress(ip: string): boolean {
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  
  if (ip.includes('/')) {
    const parsed = parseCIDR(ip)
    return parsed !== null
  }
  
  if (isValidSingleIPAddress(ip)) {
    return true
  }
  
  return ipv6Pattern.test(ip)
}

/**
 * Check if a child has any chores or "on this day" entries
 * Returns true if child has assigned chores for today OR has historical completions for this day OR has ICS calendar events for today
 */
export function hasChildActivity(
  childId: string,
  assignments: ChoreAssignment[],
  choresMap: Map<string, Chore>,
  completions: ChoreCompletion[],
  hasICSEvents: boolean
): boolean {
  // Check if child has any chores assigned for today
  const hasChores = assignments.some(
    (a) => a.childId === childId && isChoreActive(a) && isChoreActiveToday(a)
  )
  
  if (hasChores) {
    return true
  }
  
  // Check if child has ICS calendar events for today
  if (hasICSEvents) {
    return true
  }
  
  // Check if child has historical completions on this day (from previous years)
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentDay = today.getDate()
  const currentYear = today.getFullYear()
  
  const hasHistoricalCompletions = completions.some(c => {
    if (c.childId !== childId) return false
    
    const completionDate = new Date(c.completedAt)
    const eventMonth = completionDate.getMonth()
    const eventDay = completionDate.getDate()
    const eventYear = completionDate.getFullYear()
    
    return eventMonth === currentMonth && 
           eventDay === currentDay && 
           eventYear < currentYear
  })
  
  return hasHistoricalCompletions
}
