import { ChoreCompletion, ChoreFrequency, ChoreTimeOfDay, Chore, ChoreAssignment, DayOfWeek, Reward, RewardPurchase, PurchaseLimitInterval, CelebrationSettings, CelebrationAnimation, Category } from './types'

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

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function isRepeatPatternActiveToday(chore: Chore): boolean {
  if (!chore.repeatPattern) {
    return true
  }

  const pattern = chore.repeatPattern
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const anchorDate = pattern.anchorDate 
    ? new Date(pattern.anchorDate)
    : chore.startDate 
    ? new Date(chore.startDate)
    : new Date(chore.createdAt)
  
  anchorDate.setHours(0, 0, 0, 0)

  if (pattern.unit === 'weeks') {
    const todayDayOfWeek = getCurrentDayOfWeek()
    
    if (pattern.specificDays && pattern.specificDays.length > 0) {
      if (!pattern.specificDays.includes(todayDayOfWeek)) {
        return false
      }
    }

    const daysSinceAnchor = Math.floor((today.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24))
    const weeksSinceAnchor = Math.floor(daysSinceAnchor / 7)
    
    return weeksSinceAnchor % pattern.interval === 0
  }

  return true
}

export function isChoreActiveToday(chore: Chore): boolean {
  if (!isRepeatPatternActiveToday(chore)) {
    return false
  }

  if (!chore.daysOfWeek || chore.daysOfWeek.length === 0) {
    return true
  }
  const today = getCurrentDayOfWeek()
  return chore.daysOfWeek.includes(today)
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
      c.timeOfDay === timeOfDay
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
      (!timeOfDay || c.timeOfDay === timeOfDay)
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
      c.completedAt >= today.getTime()
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
        c.timeOfDay === 'am'
    )
    const pmCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === 'pm'
    )
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === choreTimeOfDay
    )
  }
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= startOfWeek.getTime()
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
        c.timeOfDay === 'am'
    )
    const pmCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === 'pm'
    )
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === choreTimeOfDay
    )
  }
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= startOfBiWeek.getTime()
  )
}

export function isChoreCompleted(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  frequency: ChoreFrequency,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  if (frequency === 'daily') {
    return isChoreCompletedToday(completions, choreId, childId, choreTimeOfDay)
  } else if (frequency === 'weekly') {
    return isChoreCompletedThisWeek(completions, choreId, childId, choreTimeOfDay)
  } else {
    return isChoreCompletedThisBiWeek(completions, choreId, childId, choreTimeOfDay)
  }
}

export function isChoreActive(chore: { startDate?: number; endDate?: number }): boolean {
  const now = Date.now()
  
  if (chore.startDate && now < chore.startDate) {
    return false
  }
  
  if (chore.endDate && now > chore.endDate) {
    return false
  }
  
  return true
}

export function getChorePointsForChild(
  chore: { points: number; pointOverrides?: { childId: string; points: number }[] },
  childId: string
): number {
  const override = chore.pointOverrides?.find(o => o.childId === childId)
  return override ? override.points : chore.points
}

export function getChoreCategoryPointsForChild(
  chore: { 
    categoryPoints?: { categoryId: string; points: number }[]
    categoryPointOverrides?: { childId: string; categoryId: string; points: number }[]
  },
  childId: string,
  categoryId: string
): number {
  const override = chore.categoryPointOverrides?.find(
    o => o.childId === childId && o.categoryId === categoryId
  )
  if (override) return override.points
  
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
  choresMap: Map<string, { frequency: ChoreFrequency; timeOfDay: ChoreTimeOfDay }>
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
  choresMap: Map<string, { points: number; completionType?: string; pointOverrides?: { childId: string; points: number }[] }>,
  childId: string,
  assignments?: ChoreAssignment[]
): number {
  return completions
    .filter((c) => c.childId === childId)
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      if (!chore) return sum
      
      const chorePoints = getChorePointsForChild(chore, childId)
      
      if (chore.completionType === 'shareable' && assignments) {
        const assignedChildren = assignments.filter(a => a.choreId === c.choreId).length
        if (assignedChildren > 1) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const completionsToday = completions.filter(comp => 
            comp.choreId === c.choreId && 
            comp.completedAt >= today.getTime() &&
            (!c.timeOfDay || comp.timeOfDay === c.timeOfDay)
          )
          
          const childrenWhoCompleted = new Set(completionsToday.map(comp => comp.childId)).size
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
    pointOverrides?: { childId: string; points: number }[]
    categoryIds: string[]
    categoryPoints?: { categoryId: string; points: number }[]
    categoryPointOverrides?: { childId: string; categoryId: string; points: number }[]
  }>,
  childId: string,
  categoryId: string,
  assignments?: ChoreAssignment[]
): number {
  return completions
    .filter((c) => c.childId === childId)
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      if (!chore || !chore.categoryIds.includes(categoryId)) return sum
      
      const chorePoints = getChoreCategoryPointsForChild(chore, childId, categoryId)
      
      if (chore.completionType === 'shareable' && assignments) {
        const assignedChildren = assignments.filter(a => a.choreId === c.choreId).length
        if (assignedChildren > 1) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const completionsToday = completions.filter(comp => 
            comp.choreId === c.choreId && 
            comp.completedAt >= today.getTime() &&
            (!c.timeOfDay || comp.timeOfDay === c.timeOfDay)
          )
          
          const childrenWhoCompleted = new Set(completionsToday.map(comp => comp.childId)).size
          if (childrenWhoCompleted > 0) {
            return sum + (chorePoints / childrenWhoCompleted)
          }
        }
      }
      
      return sum + chorePoints
    }, 0)
}

export function getChildAvailablePointsByCategory(
  totalPoints: number,
  purchases: { rewardId: string; cost: number }[],
  rewardsMap: Map<string, { categoryIds: string[] }>,
  categoryId: string
): number {
  const spent = purchases.reduce((sum, p) => {
    const reward = rewardsMap.get(p.rewardId)
    if (reward && reward.categoryIds.includes(categoryId)) {
      return sum + p.cost
    }
    return sum
  }, 0)
  return totalPoints - spent
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  {
    name: 'Regular',
    color: 'oklch(0.6 0.22 290)',
    description: 'Daily activities and routine chores',
  },
  {
    name: 'Extra',
    color: 'oklch(0.72 0.18 45)',
    description: 'Special chores for extra rewards',
  },
]
